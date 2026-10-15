begin;
-- Treat GitHub's case-insensitive owner/repository names as the same PR.
-- Existing collisions deliberately abort deployment rather than deleting records.
create unique index contributions_canonical_pr_idx on public.contributions(participant_id,lower(pr_url));
alter table public.contributions add constraint canonical_github_pr_url check (
  char_length(pr_url)<=2000 and
  pr_url ~ '^https://github[.]com/[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?/[A-Za-z0-9_.-]+/pull/[1-9][0-9]*$'
  and split_part(pr_url,'/',5) not in ('.','..')
);
-- Each edit gets a distinct version even when writes share a transaction clock.
create function private.touch_contribution_version() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.updated_at:=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');
  return new;
end;
$$;
revoke all on function private.touch_contribution_version() from public,anon,authenticated;
drop trigger touch_contributions on public.contributions;
create trigger touch_contributions before update on public.contributions for each row execute function private.touch_contribution_version();
commit;
