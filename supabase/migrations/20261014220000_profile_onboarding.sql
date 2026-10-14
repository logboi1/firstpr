begin;
alter table public.profiles add column onboarding_completed boolean not null default false;
-- An editable preference only; this flag never grants a role or data access.
grant update(onboarding_completed) on public.profiles to authenticated;
commit;
