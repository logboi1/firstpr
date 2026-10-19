begin;
-- FirstPR workflow closure is independent of the PR's GitHub status/audit.
alter table public.contributions add column closed_at timestamptz,
  add column closed_by uuid references public.profiles(id) on delete restrict,
  add constraint contribution_closure check (
    (closed_at is null and closed_by is null)
    or (closed_at is not null and closed_by is not null and status='merged')
  );
create or replace function private.guard_contribution_update() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.closed_at is distinct from old.closed_at or new.closed_by is distinct from old.closed_by then
    if auth.uid() is null or not (old.participant_id=auth.uid() or private.has_role('curator'))
      or old.status<>'merged' or new.status<>'merged'
      or (to_jsonb(new)-'closed_at'-'closed_by'-'updated_at') is distinct from (to_jsonb(old)-'closed_at'-'closed_by'-'updated_at') then
      raise exception 'Only an owner or curator may close or reopen a merged contribution' using errcode='42501';
    end if;
    if new.closed_at is null then new.closed_by:=null;
    else new.closed_at:=clock_timestamp(); new.closed_by:=auth.uid(); end if;
    return new;
  end if;
  if current_setting('role',true)='service_role' and old.status='submitted' and new.status='merged'
    and new.verification_source='github' and new.pr_url=old.pr_url
    and new.participant_id=old.participant_id and new.opportunity_id=old.opportunity_id then
    return new;
  end if;
  if auth.uid() is null then raise exception 'Authenticated workflow actor required' using errcode='42501'; end if;
  if private.has_role('curator') and old.participant_id<>auth.uid() and new.pr_url=old.pr_url then
    if new.status<>old.status then
      if new.status<>'merged' then new.closed_at:=null; new.closed_by:=null; end if;
      new.github_merged_at:=null; new.github_pr_id:=null; new.github_author_id:=null;
      if new.status='submitted' then
        new.verifier_id:=null; new.verified_at:=null; new.verification_source:=null;
      else
        new.verifier_id:=auth.uid(); new.verified_at:=now(); new.verification_source:='curator';
      end if;
    end if;
    return new;
  end if;
  if old.participant_id=auth.uid() and old.status='submitted' and new.status='submitted' then return new; end if;
  raise exception 'Only another curator may verify a contribution' using errcode='42501';
end;
$$;

-- No new client column grants or UPDATE policies. Only this narrow workflow
-- bypasses RLS, after checking the real actor and locking an authorized row.
create function private.set_contribution_closed(wanted uuid,expected_version timestamptz,closed boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare c public.contributions;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  select * into c from public.contributions where id=wanted
    and (participant_id=auth.uid() or private.has_role('curator')) for update;
  if not found or c.status<>'merged' or c.updated_at is distinct from expected_version
    or closed is null or (c.closed_at is not null)=closed then return false; end if;
  update public.contributions set closed_at=case when closed then clock_timestamp() else null end where id=c.id;
  return true;
end;
$$;
create function public.set_contribution_closed(wanted uuid,expected_version timestamptz,closed boolean) returns boolean
language sql security invoker set search_path='' as $$ select private.set_contribution_closed(wanted,expected_version,closed); $$;
revoke all on function private.set_contribution_closed(uuid,timestamptz,boolean),
  public.set_contribution_closed(uuid,timestamptz,boolean) from public,anon,authenticated;
grant execute on function private.set_contribution_closed(uuid,timestamptz,boolean),
  public.set_contribution_closed(uuid,timestamptz,boolean) to authenticated;
commit;
