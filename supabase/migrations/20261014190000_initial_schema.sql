begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create type public.app_role as enum ('mentor', 'curator');
create type public.experience_level as enum ('beginner', 'intermediate', 'experienced');
create type public.opportunity_status as enum ('draft', 'published', 'archived');
create type public.contribution_type as enum ('code', 'documentation', 'design', 'testing');
create type public.difficulty_level as enum ('beginner', 'intermediate', 'advanced');
create type public.help_status as enum ('open', 'claimed', 'resolved', 'cancelled');
create type public.pr_status as enum ('submitted', 'merged', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New contributor' check (char_length(btrim(display_name)) between 1 and 80),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  experience public.experience_level not null default 'beginner',
  public_board_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  summary text not null check (char_length(btrim(summary)) between 1 and 2000),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  contribution_type public.contribution_type not null,
  difficulty public.difficulty_level not null default 'beginner',
  repository_url text not null check (repository_url ~ '^https://[^[:space:]]+$'),
  issue_url text not null check (issue_url ~ '^https://[^[:space:]]+$'),
  prerequisites text not null default '' check (char_length(prerequisites) <= 5000),
  setup_notes text not null default '' check (char_length(setup_notes) <= 10000),
  status public.opportunity_status not null default 'draft',
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_instructions check (status <> 'published' or char_length(btrim(setup_notes)) > 0)
);
create table public.checklist_steps (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 500),
  position integer not null check (position >= 0),
  unique (opportunity_id, position)
);
create table public.checklist_progress (
  participant_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  checklist_step_id uuid not null references public.checklist_steps(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (participant_id, checklist_step_id)
);
create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id),
  blocker text not null check (char_length(btrim(blocker)) between 1 and 4000),
  status public.help_status not null default 'open',
  assigned_mentor_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_assignment check (
    (status = 'open' and assigned_mentor_id is null)
    or (status in ('claimed', 'resolved') and assigned_mentor_id is not null)
    or status = 'cancelled'
  )
);
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id),
  pr_url text not null check (pr_url ~ '^https://github[.]com/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+/pull/[1-9][0-9]*$'),
  status public.pr_status not null default 'submitted',
  verifier_id uuid references public.profiles(id) on delete restrict,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, pr_url),
  constraint contribution_verification check (
    (status = 'submitted' and verifier_id is null and verified_at is null)
    or (status <> 'submitted' and verifier_id is not null and verified_at is not null)
  )
);

create index opportunities_status_idx on public.opportunities(status);
create index opportunities_creator_idx on public.opportunities(created_by);
create index progress_step_idx on public.checklist_progress(checklist_step_id);
create index help_participant_opportunity_idx on public.help_requests(participant_id, opportunity_id);
create index help_queue_idx on public.help_requests(status, created_at);
create index help_assignee_idx on public.help_requests(assigned_mentor_id);
create index help_opportunity_idx on public.help_requests(opportunity_id);
create index contributions_participant_opportunity_idx on public.contributions(participant_id, opportunity_id);
create index contributions_opportunity_idx on public.contributions(opportunity_id);
create index contributions_verifier_idx on public.contributions(verifier_id);

-- Policy helpers are private, use a fixed search path, and never accept a caller user ID.
create function private.has_role(wanted public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = wanted);
$$;
create function private.has_started(wanted uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists (select 1 from public.checklist_progress p join public.checklist_steps s on s.id = p.checklist_step_id
      where p.participant_id = auth.uid() and s.opportunity_id = wanted)
    or exists (select 1 from public.help_requests h where h.participant_id = auth.uid() and h.opportunity_id = wanted)
    or exists (select 1 from public.contributions c where c.participant_id = auth.uid() and c.opportunity_id = wanted)
  );
$$;
create function private.can_read_opportunity(wanted uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.opportunities o where o.id = wanted and (
    o.status = 'published' or private.has_role('curator')
    or (o.status = 'archived' and private.has_started(wanted))
  ));
$$;
create function private.can_continue_opportunity(wanted uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.opportunities o where o.id = wanted and (
    o.status = 'published' or (o.status = 'archived' and private.has_started(wanted))
  ));
$$;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Never trust signup metadata for elevated roles, consent, or identity.
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

create function private.guard_help_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authenticated workflow actor required' using errcode = '42501'; end if;
  if new.participant_id <> old.participant_id or new.opportunity_id <> old.opportunity_id then
    raise exception 'Help request ownership cannot change' using errcode = '42501';
  end if;
  if old.participant_id = auth.uid() and old.status in ('open', 'claimed') and (
    (new.status = 'cancelled' and new.assigned_mentor_id is not distinct from old.assigned_mentor_id and new.blocker = old.blocker)
    or (old.status = 'open' and new.status = 'open' and new.assigned_mentor_id is null)
  ) then return new; end if;
  if private.has_role('mentor') and new.blocker = old.blocker and (
    (old.status = 'open' and new.status = 'claimed' and new.assigned_mentor_id = auth.uid())
    or (old.status = 'claimed' and old.assigned_mentor_id = auth.uid() and (
      (new.status = 'open' and new.assigned_mentor_id is null)
      or (new.status = 'resolved' and new.assigned_mentor_id = auth.uid())
    ))
  ) then return new; end if;
  raise exception 'Help transition is not allowed' using errcode = '42501';
end;
$$;
create trigger guard_help_update before update on public.help_requests for each row execute function private.guard_help_update();

create function private.guard_contribution_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authenticated workflow actor required' using errcode = '42501'; end if;
  if private.has_role('curator') and old.participant_id <> auth.uid() and new.pr_url = old.pr_url then
    if new.status <> old.status then
      if new.status = 'submitted' then new.verifier_id := null; new.verified_at := null;
      else new.verifier_id := auth.uid(); new.verified_at := now(); end if;
    end if;
    return new;
  end if;
  if old.participant_id = auth.uid() and old.status = 'submitted' and new.status = 'submitted' then return new; end if;
  raise exception 'Only another curator may verify a contribution' using errcode = '42501';
end;
$$;
create trigger guard_contribution_update before update on public.contributions for each row execute function private.guard_contribution_update();

create function private.guard_step_change() returns trigger
language plpgsql set search_path = '' as $$
declare parent_status public.opportunity_status;
begin
  select status into parent_status from public.opportunities where id = old.opportunity_id;
  if parent_status = 'archived' or (tg_op = 'DELETE' and parent_status <> 'draft') then
    raise exception 'Preserve published and archived checklist history' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.opportunity_id <> old.opportunity_id then
    raise exception 'Checklist parent cannot change' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger guard_step_change before update or delete on public.checklist_steps for each row execute function private.guard_step_change();

create trigger touch_profiles before update on public.profiles for each row execute function private.touch_updated_at();
create trigger touch_opportunities before update on public.opportunities for each row execute function private.touch_updated_at();
create trigger touch_help before update on public.help_requests for each row execute function private.touch_updated_at();
create trigger touch_contributions before update on public.contributions for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.opportunities enable row level security;
alter table public.checklist_steps enable row level security;
alter table public.checklist_progress enable row level security;
alter table public.help_requests enable row level security;
alter table public.contributions enable row level security;

-- Reset potentially broad Supabase defaults before assigning explicit privileges.
revoke all on public.profiles, public.user_roles, public.opportunities, public.checklist_steps,
  public.checklist_progress, public.help_requests, public.contributions from public, anon, authenticated;
grant select on public.opportunities, public.checklist_steps to anon, authenticated;
grant select on public.profiles, public.user_roles, public.checklist_progress, public.help_requests, public.contributions to authenticated;
grant update(display_name, skills, experience, public_board_consent) on public.profiles to authenticated;
grant insert(title, summary, skills, contribution_type, difficulty, repository_url, issue_url, prerequisites, setup_notes, status)
  on public.opportunities to authenticated;
grant update(title, summary, skills, contribution_type, difficulty, repository_url, issue_url, prerequisites, setup_notes, status)
  on public.opportunities to authenticated;
grant insert(opportunity_id, label, position), update(label, position), delete on public.checklist_steps to authenticated;
grant insert(checklist_step_id), update(completed_at), delete on public.checklist_progress to authenticated;
grant insert(opportunity_id, blocker), update(blocker, status, assigned_mentor_id) on public.help_requests to authenticated;
grant insert(opportunity_id, pr_url), update(pr_url, status) on public.contributions to authenticated;

create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy roles_self_read on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
create policy opportunities_read on public.opportunities for select to anon, authenticated using (private.has_role('curator') or private.can_read_opportunity(id));
create policy opportunities_create on public.opportunities for insert to authenticated with check (private.has_role('curator') and created_by = (select auth.uid()));
create policy opportunities_edit on public.opportunities for update to authenticated using (private.has_role('curator') and status <> 'archived') with check (private.has_role('curator'));
create policy steps_read on public.checklist_steps for select to anon, authenticated using (private.can_read_opportunity(opportunity_id));
create policy steps_create on public.checklist_steps for insert to authenticated with check (
  private.has_role('curator') and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status <> 'archived')
);
create policy steps_edit on public.checklist_steps for update to authenticated using (private.has_role('curator')) with check (private.has_role('curator'));
create policy steps_delete on public.checklist_steps for delete to authenticated using (private.has_role('curator'));
create policy progress_read on public.checklist_progress for select to authenticated using (participant_id = (select auth.uid()));
create policy progress_create on public.checklist_progress for insert to authenticated with check (
  participant_id = (select auth.uid()) and exists (select 1 from public.checklist_steps s where s.id = checklist_step_id and private.can_continue_opportunity(s.opportunity_id))
);
create policy progress_edit on public.checklist_progress for update to authenticated using (participant_id = (select auth.uid())) with check (participant_id = (select auth.uid()));
create policy progress_delete on public.checklist_progress for delete to authenticated using (participant_id = (select auth.uid()));
create policy help_read on public.help_requests for select to authenticated using (participant_id = (select auth.uid()) or private.has_role('mentor'));
create policy help_create on public.help_requests for insert to authenticated with check (
  participant_id = (select auth.uid()) and status = 'open' and assigned_mentor_id is null and private.can_continue_opportunity(opportunity_id)
);
create policy help_edit on public.help_requests for update to authenticated using (
  (participant_id = (select auth.uid()) and status in ('open', 'claimed'))
  or (private.has_role('mentor') and (status = 'open' or (status = 'claimed' and assigned_mentor_id = (select auth.uid()))))
) with check (participant_id = (select auth.uid()) or private.has_role('mentor'));
create policy contributions_read on public.contributions for select to authenticated using (participant_id = (select auth.uid()) or private.has_role('curator'));
create policy contributions_create on public.contributions for insert to authenticated with check (
  participant_id = (select auth.uid()) and status = 'submitted' and verifier_id is null and verified_at is null and private.can_continue_opportunity(opportunity_id)
);
create policy contributions_edit on public.contributions for update to authenticated using (
  (participant_id = (select auth.uid()) and status = 'submitted') or private.has_role('curator')
) with check (participant_id = (select auth.uid()) or private.has_role('curator'));

-- Deliberately narrow public projection; never grant visitors SELECT on private tables.
create function public.get_public_progress(page_size integer default 50)
returns table(display_name text, pr_url text, status public.pr_status, submitted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.display_name, c.pr_url, c.status, c.created_at
  from public.contributions c join public.profiles p on p.id = c.participant_id
  where p.public_board_consent
  order by c.created_at desc, c.id
  limit greatest(1, least(coalesce(page_size, 50), 100));
$$;
revoke all on function public.get_public_progress(integer) from public, anon, authenticated;
grant execute on function public.get_public_progress(integer) to anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.has_role(public.app_role), private.has_started(uuid),
  private.can_read_opportunity(uuid), private.can_continue_opportunity(uuid) to anon, authenticated;

commit;
