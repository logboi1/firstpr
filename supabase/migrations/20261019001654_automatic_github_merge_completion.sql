begin;
alter table public.contributions
  add column verification_source text check (verification_source in ('curator','github')),
  add column github_merged_at timestamptz,
  add column github_pr_id text,
  add column github_author_id text;
alter table public.contributions drop constraint contribution_verification;
alter table public.contributions add constraint contribution_verification check (
  (status='submitted' and verifier_id is null and verified_at is null and verification_source is null
    and github_merged_at is null and github_pr_id is null and github_author_id is null)
  or (status<>'submitted' and verifier_id is not null and verified_at is not null
    and (verification_source is null or verification_source='curator')
    and github_merged_at is null and github_pr_id is null and github_author_id is null)
  or (status='merged' and verifier_id is null and verified_at is not null and verification_source='github'
    and github_merged_at is not null and github_pr_id ~ '^[1-9][0-9]*$' and github_author_id ~ '^[1-9][0-9]*$'
    and github_pr_id is not null and github_author_id is not null)
);
create or replace function private.guard_contribution_update() returns trigger
language plpgsql set search_path='' as $$
begin
  if current_setting('role',true)='service_role' and old.status='submitted' and new.status='merged'
    and new.verification_source='github' and new.pr_url=old.pr_url
    and new.participant_id=old.participant_id and new.opportunity_id=old.opportunity_id then
    return new;
  end if;
  if auth.uid() is null then raise exception 'Authenticated workflow actor required' using errcode='42501'; end if;
  if private.has_role('curator') and old.participant_id<>auth.uid() and new.pr_url=old.pr_url then
    if new.status<>old.status then
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
-- Private definer helpers are reachable only through service-role invoker wrappers.
-- Participant identity comes from auth.identities.provider_id, never editable metadata.
create table private.github_merge_checks (
  contribution_id uuid primary key references public.contributions(id) on delete cascade,
  pr_url text not null, version timestamptz not null, checked_at timestamptz not null
);
alter table private.github_merge_checks enable row level security;
revoke all on private.github_merge_checks from public,anon,authenticated;
create function private.github_merge_candidates(actor uuid) returns jsonb
language sql security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (
    select c.id,c.pr_url,c.updated_at,o.repository_url
    from public.contributions c join public.opportunities o on o.id=c.opportunity_id
    left join private.github_merge_checks checks on checks.contribution_id=c.id and checks.pr_url=c.pr_url and checks.version=c.updated_at
    where c.participant_id=actor and c.status='submitted'
      and (checks.checked_at is null or checks.checked_at<clock_timestamp()-interval '5 minutes')
    order by checks.checked_at nulls first,c.created_at,c.id limit 10
  ) q;
$$;
create function private.note_github_merge_check(wanted uuid,expected_url text,expected_version timestamptz) returns void
language sql security definer set search_path='' as $$
  insert into private.github_merge_checks(contribution_id,pr_url,version,checked_at)
  select id,pr_url,updated_at,clock_timestamp() from public.contributions
  where id=wanted and pr_url=expected_url and updated_at=expected_version
  on conflict(contribution_id) do update set pr_url=excluded.pr_url,version=excluded.version,checked_at=excluded.checked_at;
$$;
create function private.complete_github_merge(wanted uuid, expected_url text, expected_version timestamptz,
  author_id text, repository text, pr_id text, merged_at timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
declare c public.contributions; repo text;
begin
  if current_setting('role',true)<>'service_role' then raise insufficient_privilege; end if;
  if author_id is null or pr_id is null or author_id !~ '^[1-9][0-9]*$' or pr_id !~ '^[1-9][0-9]*$'
    or merged_at is null or merged_at>clock_timestamp()+interval '5 minutes' then return false; end if;
  select * into c from public.contributions where id=wanted for update;
  if not found or c.status<>'submitted' or c.pr_url is distinct from expected_url or c.updated_at is distinct from expected_version then return false; end if;
  select repository_url into repo from public.opportunities where id=c.opportunity_id for share;
  if lower(repo)<>('https://github.com/'||lower(repository))
    or lower(split_part(c.pr_url,'/',4)||'/'||split_part(c.pr_url,'/',5)) is distinct from lower(repository)
    or not exists (select 1 from auth.identities i where i.user_id=c.participant_id and i.provider='github' and i.provider_id=author_id)
    then return false; end if;
  update public.contributions set status='merged',verification_source='github',verifier_id=null,
    verified_at=clock_timestamp(),github_merged_at=merged_at,github_pr_id=pr_id,github_author_id=author_id where id=c.id;
  return true;
end;
$$;
create function public.github_merge_candidates(actor uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.github_merge_candidates(actor); $$;
create function public.note_github_merge_check(wanted uuid,expected_url text,expected_version timestamptz) returns void
language sql security invoker set search_path='' as $$ select private.note_github_merge_check(wanted,expected_url,expected_version); $$;
create function public.complete_github_merge(wanted uuid, expected_url text, expected_version timestamptz,
  author_id text, repository text, pr_id text, merged_at timestamptz) returns boolean
language sql security invoker set search_path='' as $$
  select private.complete_github_merge(wanted,expected_url,expected_version,author_id,repository,pr_id,merged_at);
$$;
revoke all on function private.github_merge_candidates(uuid),public.github_merge_candidates(uuid),
  private.note_github_merge_check(uuid,text,timestamptz),public.note_github_merge_check(uuid,text,timestamptz),
  private.complete_github_merge(uuid,text,timestamptz,text,text,text,timestamptz),
  public.complete_github_merge(uuid,text,timestamptz,text,text,text,timestamptz) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.github_merge_candidates(uuid),public.github_merge_candidates(uuid),
  private.note_github_merge_check(uuid,text,timestamptz),public.note_github_merge_check(uuid,text,timestamptz),
  private.complete_github_merge(uuid,text,timestamptz,text,text,text,timestamptz),
  public.complete_github_merge(uuid,text,timestamptz,text,text,text,timestamptz) to service_role;
commit;
