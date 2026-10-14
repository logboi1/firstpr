begin;
create table public.opportunity_participations (
  participant_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id),
  started_at timestamptz not null default now(),
  primary key (participant_id, opportunity_id)
);
create index participations_opportunity_idx on public.opportunity_participations(opportunity_id);
alter table public.opportunity_participations enable row level security;
revoke all on public.opportunity_participations from public, anon, authenticated;
grant select on public.opportunity_participations to authenticated;
create policy participations_self_read on public.opportunity_participations for select to authenticated
  using (participant_id = (select auth.uid()));
-- Preserve starts from the pre-existing workflows before adding durable markers.
insert into public.opportunity_participations(participant_id,opportunity_id)
select p.participant_id,s.opportunity_id from public.checklist_progress p join public.checklist_steps s on s.id=p.checklist_step_id
union select participant_id,opportunity_id from public.help_requests
union select participant_id,opportunity_id from public.contributions
on conflict do nothing;
create or replace function private.has_started(wanted uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists (select 1 from public.opportunity_participations p where p.participant_id=auth.uid() and p.opportunity_id=wanted)
    or exists (select 1 from public.checklist_progress p join public.checklist_steps s on s.id=p.checklist_step_id
      where p.participant_id=auth.uid() and s.opportunity_id=wanted)
    or exists (select 1 from public.help_requests h where h.participant_id=auth.uid() and h.opportunity_id=wanted)
    or exists (select 1 from public.contributions c where c.participant_id=auth.uid() and c.opportunity_id=wanted)
  );
$$;
-- A direct progress insert must also acquire the archive lock and preserve a start.
create function private.preserve_checklist_start() returns trigger
language plpgsql security definer set search_path = '' as $$
declare task uuid; task_status public.opportunity_status;
begin
  if auth.uid() is null or new.participant_id <> auth.uid() then
    raise exception 'Authenticated owner required' using errcode='42501';
  end if;
  select s.opportunity_id into task from public.checklist_steps s where s.id=new.checklist_step_id;
  select o.status into task_status from public.opportunities o where o.id=task for share;
  if task_status is null or not (task_status='published' or (task_status='archived' and private.has_started(task))) then
    raise exception 'Task is unavailable' using errcode='42501';
  end if;
  insert into public.opportunity_participations(participant_id,opportunity_id)
    values (auth.uid(),task) on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.preserve_checklist_start() from public, anon, authenticated;
create trigger preserve_checklist_start before insert on public.checklist_progress
  for each row execute function private.preserve_checklist_start();
-- Definer access is narrowly required to write the otherwise read-only start table.
create function public.start_opportunity(wanted uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare task_status public.opportunity_status;
begin
  if auth.uid() is null then raise exception 'Sign-in required' using errcode='42501'; end if;
  select o.status into task_status from public.opportunities o where o.id=wanted for share;
  if task_status is null or not (task_status='published' or (task_status='archived' and private.has_started(wanted))) then
    raise exception 'Task is unavailable' using errcode='42501';
  end if;
  insert into public.opportunity_participations(participant_id,opportunity_id)
    values (auth.uid(),wanted) on conflict do nothing;
end;
$$;
create function public.set_checklist_step(wanted uuid, step uuid, completed boolean) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign-in required' using errcode='42501'; end if;
  if completed is null or not exists (
    select 1 from public.checklist_steps s where s.id=step and s.opportunity_id=wanted
      and private.can_continue_opportunity(wanted)
  ) then raise exception 'Checklist step is unavailable' using errcode='42501'; end if;
  if completed then
    insert into public.checklist_progress(checklist_step_id) values (step) on conflict do nothing;
  else
    delete from public.checklist_progress where checklist_step_id=step and participant_id=auth.uid();
  end if;
end;
$$;
create function private.step_is_completed(step uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.checklist_progress p where p.checklist_step_id=step and p.participant_id=auth.uid()
  );
$$;
revoke all on function private.step_is_completed(uuid) from public, anon, authenticated;
grant execute on function private.step_is_completed(uuid) to anon, authenticated;
create function public.get_opportunity_detail(wanted uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id',o.id,'title',o.title,'summary',o.summary,'skills',o.skills,
    'contribution_type',o.contribution_type,'difficulty',o.difficulty,
    'repository_url',o.repository_url,'issue_url',o.issue_url,
    'prerequisites',o.prerequisites,'setup_notes',o.setup_notes,'status',o.status,
    'started',private.has_started(o.id),
    'steps',coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'label',s.label,'position',s.position,'completed',private.step_is_completed(s.id)
    ) order by s.position,s.id) from public.checklist_steps s where s.opportunity_id=o.id),'[]'::jsonb)
  ) from public.opportunities o where o.id=wanted and
    (o.status='published' or (o.status='archived' and private.has_started(o.id)));
$$;
revoke all on function public.start_opportunity(uuid),public.set_checklist_step(uuid,uuid,boolean),public.get_opportunity_detail(uuid)
  from public,anon,authenticated;
grant execute on function public.start_opportunity(uuid),public.set_checklist_step(uuid,uuid,boolean) to authenticated;
grant execute on function public.get_opportunity_detail(uuid) to anon,authenticated;
commit;
