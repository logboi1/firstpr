begin;
create function public.get_participant_dashboard(page_number integer default 1)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  with starts as (
    select opportunity_id,min(started_at) started_at from (
      select p.opportunity_id,p.started_at from public.opportunity_participations p where p.participant_id=auth.uid()
      union all select s.opportunity_id,p.completed_at from public.checklist_progress p join public.checklist_steps s on s.id=p.checklist_step_id where p.participant_id=auth.uid()
      union all select h.opportunity_id,h.created_at from public.help_requests h where h.participant_id=auth.uid()
      union all select c.opportunity_id,c.created_at from public.contributions c where c.participant_id=auth.uid()
    ) history group by opportunity_id
  ), tasks as (
    select o.id,o.title,o.status,s.started_at,
      (select count(*) from public.checklist_steps step where step.opportunity_id=o.id) as steps_total,
      (select count(*) from public.checklist_progress p join public.checklist_steps step on step.id=p.checklist_step_id where step.opportunity_id=o.id and p.participant_id=auth.uid()) as steps_completed,
      (select count(*) from public.help_requests h where h.opportunity_id=o.id and h.participant_id=auth.uid() and h.status in ('open','claimed')) as active_help,
      (select count(*) from public.contributions c where c.opportunity_id=o.id and c.participant_id=auth.uid() and c.status='submitted') as submitted,
      (select count(*) from public.contributions c where c.opportunity_id=o.id and c.participant_id=auth.uid() and c.status='merged') as merged,
      (select count(*) from public.contributions c where c.opportunity_id=o.id and c.participant_id=auth.uid() and c.status='closed') as closed
    from starts s join public.opportunities o on o.id=s.opportunity_id where o.status in ('published','archived')
  ), totals as (
    select count(*) total,greatest(1,ceil(count(*)/12.0)::integer) pages,
      coalesce(sum(steps_total),0) steps_total,coalesce(sum(steps_completed),0) steps_completed from tasks
  ), paging as (
    select *,greatest(1,least(coalesce(page_number,1),pages)) page from totals
  ), page_rows as (
    select * from tasks order by started_at desc,id limit 12 offset (((select page from paging)-1)*12)
  ) select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(t) order by started_at desc,id) from page_rows t),'[]'::jsonb),
    'total',total,'page',page,'pages',pages,'steps_total',steps_total,'steps_completed',steps_completed,
    'help',(select jsonb_build_object('open',count(*) filter(where status='open'),'claimed',count(*) filter(where status='claimed'),'resolved',count(*) filter(where status='resolved'),'cancelled',count(*) filter(where status='cancelled')) from public.help_requests where participant_id=auth.uid()),
    'contributions',(select jsonb_build_object('submitted',count(*) filter(where status='submitted'),'merged',count(*) filter(where status='merged'),'closed',count(*) filter(where status='closed')) from public.contributions where participant_id=auth.uid())
  ) into result from paging;
  return result;
end;
$$;
revoke all on function public.get_participant_dashboard(integer) from public,anon,authenticated;
grant execute on function public.get_participant_dashboard(integer) to authenticated;

-- Definer access is required to project consented records without exposing
-- private profiles or granting visitors SELECT on contribution tables.
create function public.get_public_progress_board(page_number integer default 1,status_filter text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if status_filter is null or status_filter not in ('','submitted','merged','closed') then
    raise exception 'Invalid progress filter' using errcode='22023';
  end if;
  with visible as materialized (
    select c.id,p.display_name,c.pr_url,c.status,c.created_at as submitted_at
    from public.contributions c join public.profiles p on p.id=c.participant_id where p.public_board_consent
  ), matched as (select * from visible where status_filter='' or status::text=status_filter),
  totals as (select count(*) total,greatest(1,ceil(count(*)/20.0)::integer) pages from matched),
  paging as (select *,greatest(1,least(coalesce(page_number,1),pages)) page from totals),
  page_rows as (select * from matched order by submitted_at desc,id limit 20 offset (((select page from paging)-1)*20))
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(jsonb_build_object('display_name',display_name,'pr_url',pr_url,'status',status,'submitted_at',submitted_at) order by submitted_at desc,id) from page_rows),'[]'::jsonb),
    'total',total,'page',page,'pages',pages,
    'counts',(select jsonb_build_object('submitted',count(*) filter(where status='submitted'),'merged',count(*) filter(where status='merged'),'closed',count(*) filter(where status='closed')) from visible)
  ) into result from paging;
  return result;
end;
$$;
revoke all on function public.get_public_progress_board(integer,text) from public,anon,authenticated;
grant execute on function public.get_public_progress_board(integer,text) to anon,authenticated;
commit;
