begin;
create function private.safe_opportunity_url(value text) returns boolean
language sql immutable set search_path='' as $$
  select char_length(value)<=2000 and value ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(/[^[:space:]]*)?$'
    and position(chr(92) in value)=0;
$$;
revoke all on function private.safe_opportunity_url(text) from public,anon,authenticated;
grant execute on function private.safe_opportunity_url(text) to authenticated;
alter table public.opportunities drop constraint opportunities_repository_url_check, drop constraint opportunities_issue_url_check;
alter table public.opportunities add constraint repository_link_valid check (
  (status<>'published' and repository_url='') or private.safe_opportunity_url(repository_url));
alter table public.opportunities add constraint issue_link_valid check (
  (status<>'published' and issue_url='') or private.safe_opportunity_url(issue_url));
create function private.guard_opportunity_lifecycle() returns trigger
language plpgsql set search_path='' as $$
begin
  -- Trusted SQL administrators can repair/import fixtures; client RLS still applies.
  if auth.uid() is null then return new; end if;
  if tg_op='UPDATE' and (old.status='archived' or (old.status='published' and new.status='draft')) then
    raise exception 'Published history must be preserved; archives are read-only' using errcode='42501';
  end if;
  if new.status='published' then
    if btrim(new.setup_notes)='' or cardinality(new.skills)=0 or exists(select 1 from unnest(new.skills) s where s is null or char_length(btrim(s)) not between 1 and 60) or
      not private.safe_opportunity_url(new.repository_url) or not private.safe_opportunity_url(new.issue_url) or
      (select count(*) from public.checklist_steps s where s.opportunity_id=new.id) not between 1 and 50 then
      raise exception 'Add setup instructions, skills, valid links, and a checklist before publishing' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_opportunity_lifecycle() from public,anon,authenticated;
create trigger guard_opportunity_lifecycle before insert or update on public.opportunities
  for each row execute function private.guard_opportunity_lifecycle();
create or replace function private.guard_step_change() returns trigger
language plpgsql set search_path='' as $$
declare parent public.opportunity_status; task uuid;
begin
  if auth.uid() is null then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  if tg_op='INSERT' then task:=new.opportunity_id; else task:=old.opportunity_id; end if;
  select status into parent from public.opportunities where id=task for update;
  if parent is distinct from 'draft'::public.opportunity_status then
    raise exception 'Checklist editing is available only for drafts' using errcode='42501';
  end if;
  if tg_op='UPDATE' and new.opportunity_id<>old.opportunity_id then
    raise exception 'Checklist parent cannot change' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
create trigger guard_step_insert before insert on public.checklist_steps
  for each row execute function private.guard_step_change();
create function public.save_curator_opportunity(wanted uuid,expected_updated_at timestamptz,payload jsonb,publish boolean default false)
returns uuid language plpgsql security invoker set search_path='' as $$
declare task uuid; current_status public.opportunity_status; version timestamptz; skill_values text[]; step_label text; step_position integer:=0;
begin
  if auth.uid() is null or not private.has_role('curator') then
    raise exception 'Curator access required' using errcode='42501';
  end if;
  if jsonb_typeof(payload)<>'object' or jsonb_typeof(payload->'skills')<>'array' or
    jsonb_array_length(payload->'skills')>30 or exists(
      select 1 from jsonb_array_elements(payload->'skills') v where jsonb_typeof(v)<>'string' or char_length(btrim(v#>>'{}')) not between 1 and 60
    ) then raise exception 'Invalid opportunity fields' using errcode='23514'; end if;
  select coalesce(array_agg(btrim(v)), '{}'::text[]) into skill_values from jsonb_array_elements_text(payload->'skills') v;
  if wanted is not null then
    select status,updated_at into current_status,version from public.opportunities where id=wanted for update;
    if current_status is null or current_status='archived' then raise exception 'Opportunity is unavailable or archived' using errcode='42501'; end if;
    if expected_updated_at is null or version<>expected_updated_at then raise exception 'Another curator changed this task; reload before saving' using errcode='40001'; end if;
    task:=wanted;
  else current_status:='draft'; end if;
  if current_status='draft' then
    if jsonb_typeof(payload->'steps') is distinct from 'array' or jsonb_array_length(payload->'steps')>50 or exists(
      select 1 from jsonb_array_elements(payload->'steps') v where jsonb_typeof(v)<>'string' or char_length(btrim(v#>>'{}')) not between 1 and 500
    ) then raise exception 'Invalid checklist steps' using errcode='23514'; end if;
  elsif payload->'steps' is distinct from 'null'::jsonb and payload ? 'steps' then
    raise exception 'Published checklists are locked' using errcode='42501';
  end if;
  if wanted is null then
    insert into public.opportunities(title,summary,skills,contribution_type,difficulty,repository_url,issue_url,prerequisites,setup_notes,status)
      values (btrim(payload->>'title'),btrim(payload->>'summary'),skill_values,(payload->>'contribution_type')::public.contribution_type,
        (payload->>'difficulty')::public.difficulty_level,coalesce(payload->>'repository_url',''),coalesce(payload->>'issue_url',''),
        coalesce(payload->>'prerequisites',''),coalesce(payload->>'setup_notes',''),'draft') returning id into task;
  else
    update public.opportunities set title=btrim(payload->>'title'),summary=btrim(payload->>'summary'),skills=skill_values,
      contribution_type=(payload->>'contribution_type')::public.contribution_type,difficulty=(payload->>'difficulty')::public.difficulty_level,
      repository_url=coalesce(payload->>'repository_url',''),issue_url=coalesce(payload->>'issue_url',''),
      prerequisites=coalesce(payload->>'prerequisites',''),setup_notes=coalesce(payload->>'setup_notes','') where id=task;
  end if;
  if current_status='draft' then
    delete from public.checklist_steps where opportunity_id=task;
    for step_label in select btrim(v) from jsonb_array_elements_text(payload->'steps') v loop
      insert into public.checklist_steps(opportunity_id,label,position) values(task,step_label,step_position);
      step_position:=step_position+1;
    end loop;
  end if;
  if publish then update public.opportunities set status='published' where id=task; end if;
  return task;
end;
$$;
create function public.archive_curator_opportunity(wanted uuid,expected_updated_at timestamptz) returns void
language plpgsql security invoker set search_path='' as $$
declare current_status public.opportunity_status; version timestamptz;
begin
  if auth.uid() is null or not private.has_role('curator') then raise exception 'Curator access required' using errcode='42501'; end if;
  select status,updated_at into current_status,version from public.opportunities where id=wanted for update;
  if current_status is null then raise exception 'Opportunity unavailable' using errcode='42501'; end if;
  if current_status='archived' then return; end if;
  if expected_updated_at is null or expected_updated_at<>version then raise exception 'Another curator changed this task; reload before archiving' using errcode='40001'; end if;
  update public.opportunities set status='archived' where id=wanted;
end;
$$;
create function public.get_curator_opportunity(wanted uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
  if auth.uid() is null or not private.has_role('curator') then raise exception 'Curator access required' using errcode='42501'; end if;
  return (select jsonb_build_object('id',o.id,'title',o.title,'summary',o.summary,'skills',o.skills,
    'contribution_type',o.contribution_type,'difficulty',o.difficulty,'repository_url',o.repository_url,'issue_url',o.issue_url,
    'prerequisites',o.prerequisites,'setup_notes',o.setup_notes,'status',o.status,'updated_at',o.updated_at,
    'steps',coalesce((select jsonb_agg(s.label order by s.position) from public.checklist_steps s where s.opportunity_id=o.id),'[]'::jsonb)
  ) from public.opportunities o where o.id=wanted);
end;
$$;
create function public.list_curator_opportunities(page_number integer default 1,status_filter text default '') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
  if auth.uid() is null or not private.has_role('curator') then raise exception 'Curator access required' using errcode='42501'; end if;
  return (with matched as materialized (select id,title,summary,status,updated_at from public.opportunities where status_filter='' or status::text=status_filter),
    totals as(select count(*) total,greatest(1,ceil(count(*)/20.0)::integer) pages from matched),
    paging as(select total,pages,least(greatest(coalesce(page_number,1),1),pages) page from totals),
    page_rows as(select * from matched order by updated_at desc,id limit 20 offset ((select page from paging)-1)*20)
    select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by updated_at desc,id) from page_rows p),'[]'::jsonb),'total',total,'page',page,'pages',pages) from paging);
end;
$$;
revoke all on function public.save_curator_opportunity(uuid,timestamptz,jsonb,boolean),public.archive_curator_opportunity(uuid,timestamptz),
  public.get_curator_opportunity(uuid),public.list_curator_opportunities(integer,text) from public,anon,authenticated;
grant execute on function public.save_curator_opportunity(uuid,timestamptz,jsonb,boolean),public.archive_curator_opportunity(uuid,timestamptz),
  public.get_curator_opportunity(uuid),public.list_curator_opportunities(integer,text) to authenticated;
commit;
