begin;

-- Guidance is an immutable mentor note, not a participant chat channel.
create table public.help_responses (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null references public.help_requests(id) on delete cascade,
  mentor_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000 and body ~ '[^[:space:]]'),
  created_at timestamptz not null default now()
);
create index help_responses_request_idx on public.help_responses(help_request_id,created_at,id);
create index help_responses_mentor_idx on public.help_responses(mentor_id);
alter table public.help_responses enable row level security;
revoke all on public.help_responses from public,anon,authenticated;
grant select on public.help_responses to authenticated;
grant insert(help_request_id,body) on public.help_responses to authenticated;
create policy responses_read on public.help_responses for select to authenticated using (
  exists(select 1 from public.help_requests h where h.id=help_request_id and
    (h.participant_id=(select auth.uid()) or private.has_role('mentor')))
);
create policy responses_create on public.help_responses for insert to authenticated with check (
  mentor_id=(select auth.uid()) and private.has_role('mentor') and exists(
    select 1 from public.help_requests h where h.id=help_request_id and h.status='claimed' and h.assigned_mentor_id=(select auth.uid())
  )
);

-- Lock even direct API inserts against cancellation, release and resolution.
create function private.guard_help_response() returns trigger
language plpgsql security invoker set search_path='' as $$
declare request public.help_requests;
begin
  if auth.uid() is null or not private.has_role('mentor') or new.mentor_id<>auth.uid() then
    raise exception 'Mentor access required' using errcode='42501';
  end if;
  select * into request from public.help_requests where id=new.help_request_id for update;
  if not found or request.status<>'claimed' or request.assigned_mentor_id is distinct from auth.uid() then
    raise exception 'Request is no longer assigned to you' using errcode='40001';
  end if;
  return new;
end;
$$;
create trigger guard_help_response before insert on public.help_responses for each row execute function private.guard_help_response();
revoke all on function private.guard_help_response() from public,anon,authenticated;

create function public.mentor_help_action(wanted uuid,action text,response text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare changed uuid; request public.help_requests;
begin
  if auth.uid() is null or not private.has_role('mentor') then
    raise exception 'Mentor access required' using errcode='42501';
  end if;
  if action='claim' then
    update public.help_requests set status='claimed',assigned_mentor_id=auth.uid()
      where id=wanted and status='open' returning id into changed;
  elsif action='release' then
    update public.help_requests set status='open',assigned_mentor_id=null
      where id=wanted and status='claimed' and assigned_mentor_id=auth.uid() returning id into changed;
  elsif action in ('respond','resolve') then
    if response is null or char_length(btrim(response)) not between 1 and 4000 or response !~ '[^[:space:]]' then
      raise exception 'Write guidance using 1 to 4000 characters' using errcode='22023';
    end if;
    select * into request from public.help_requests where id=wanted for update;
    if found and request.status='claimed' and request.assigned_mentor_id=auth.uid() then
      insert into public.help_responses(help_request_id,body) values(wanted,btrim(response));
      if action='resolve' then update public.help_requests set status='resolved' where id=wanted; end if;
      changed:=wanted;
    end if;
  else raise exception 'Invalid mentor action' using errcode='22023';
  end if;
  if changed is null then raise exception 'Request changed or is unavailable' using errcode='40001'; end if;
  return changed;
end;
$$;

create function public.list_mentor_help(page_number integer default 1,queue_filter text default 'open')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare total bigint; page integer; pages integer; items jsonb;
begin
  if auth.uid() is null or not private.has_role('mentor') then raise exception 'Mentor access required' using errcode='42501'; end if;
  if queue_filter is null or queue_filter not in ('open','mine','claimed','resolved','cancelled','all') then
    raise exception 'Invalid queue filter' using errcode='22023';
  end if;
  select count(*) into total from public.help_requests h where
    queue_filter='all' or (queue_filter='mine' and h.status='claimed' and h.assigned_mentor_id=auth.uid()) or h.status::text=queue_filter;
  pages:=greatest(1,ceil(total/20.0)::integer);
  page:=greatest(1,least(coalesce(page_number,1),pages));
  select coalesce(jsonb_agg(to_jsonb(item) order by item.created_at,item.id),'[]'::jsonb) into items from (
    select h.id,h.opportunity_id,o.title,h.blocker,h.status,h.created_at,h.updated_at,
      coalesce(h.assigned_mentor_id=auth.uid(),false) as assigned_to_you
    from public.help_requests h left join public.opportunities o on o.id=h.opportunity_id
    where queue_filter='all' or (queue_filter='mine' and h.status='claimed' and h.assigned_mentor_id=auth.uid()) or h.status::text=queue_filter
    order by h.created_at,h.id limit 20 offset ((page-1)*20)
  ) item;
  return jsonb_build_object('items',items,'total',total,'page',page,'pages',pages);
end;
$$;

create function public.get_help_request(wanted uuid,mentor_view boolean default false,response_page integer default 1)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare request public.help_requests; title text; notes jsonb; total bigint; page integer; pages integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if mentor_view and not private.has_role('mentor') then raise exception 'Mentor access required' using errcode='42501'; end if;
  select * into request from public.help_requests h where h.id=wanted and (mentor_view or h.participant_id=auth.uid());
  if not found then return null; end if;
  select o.title into title from public.opportunities o where o.id=request.opportunity_id;
  select count(*) into total from public.help_responses where help_request_id=wanted;
  pages:=greatest(1,ceil(total/20.0)::integer);
  page:=greatest(1,least(coalesce(response_page,1),pages));
  select coalesce(jsonb_agg(to_jsonb(note) order by note.created_at desc,note.id desc),'[]'::jsonb) into notes from (
    select id,body,created_at,(mentor_id=auth.uid()) as is_you from public.help_responses
    where help_request_id=wanted order by created_at desc,id desc limit 20 offset ((page-1)*20)
  ) note;
  return jsonb_build_object('id',request.id,'opportunity_id',request.opportunity_id,'title',title,
    'blocker',request.blocker,'status',request.status,'created_at',request.created_at,'updated_at',request.updated_at,
    'assigned_to_you',coalesce(request.assigned_mentor_id=auth.uid(),false),'responses',notes,
    'response_total',total,'response_page',page,'response_pages',pages);
end;
$$;
revoke all on function public.mentor_help_action(uuid,text,text),public.list_mentor_help(integer,text),public.get_help_request(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.mentor_help_action(uuid,text,text),public.list_mentor_help(integer,text),public.get_help_request(uuid,boolean,integer) to authenticated;
commit;
