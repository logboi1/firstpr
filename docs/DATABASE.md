# Database schema and access

The initial migration is `supabase/migrations/20261014190000_initial_schema.sql`. It creates all seven MVP tables, enums, indexes, constraints, profile bootstrap, RLS policies, column grants, workflow guards, and a narrow public progress RPC.

Issue #3 connects the application using participant sessions; see `AUTHENTICATION.md`. The additive `20261014220000_profile_onboarding.sql` migration adds an own-editable onboarding completion flag without changing authorization roles. No migration has been applied to a hosted database by the assistant.

## Apply to Supabase

Use a local Supabase stack first. Install the official Supabase CLI and Docker following the provider's documentation. From the repository:

```sh
supabase start
supabase db reset
```

The `private` schema must remain outside the API's exposed schemas. The checked-in configuration exposes `public` and `graphql_public` only. Do not expose `private` through PostgREST or add it to the API search path.

The migration assumes Supabase's existing `auth.users`, `auth.uid()`, and database roles. Do not run the test harness's auth stub on Supabase. Once validated locally, an authorized maintainer can link a dedicated development project and run `supabase db push`. Review the target project and pending migrations before that command. Do not apply test fixtures to a production database.

Supabase clients must use the public/publishable key plus the participant's validated session. A service-role key bypasses RLS and must never reach client code. Do not use service-role access to perform ordinary participant requests. Workflow updates also require a real authenticated actor for auditing.

## Tables

| Table | Purpose |
| --- | --- |
| `profiles` | Private display name, skills, experience, and public-board consent |
| `user_roles` | Administrator-controlled mentor and curator grants |
| `opportunities` | Curated tasks and publication state |
| `checklist_steps` | Ordered task instructions |
| `checklist_progress` | Completed steps per participant |
| `help_requests` | Private blockers, mentor assignments, and resolution state |
| `contributions` | Canonical GitHub PR URLs and curator verification audit |

All seven tables have RLS enabled. Explicit column grants prevent callers from replacing ownership IDs, timestamps, or verification metadata. All inserts use server-generated IDs and `auth.uid()` for ownership where applicable.

## Access matrix

Every authenticated user is a participant. Mentor and curator are additional roles; neither includes the other.

| Operation | Visitor | Participant | Mentor | Curator |
| --- | --- | --- | --- | --- |
| Read published opportunities and steps | Yes | Yes | Yes | Yes |
| Read draft opportunities | No | No | No | Yes |
| Create or edit opportunities | No | No | No | Yes |
| Read/edit profile | No | Own | Own | Own |
| Assign elevated roles | No | No | No | No |
| Manage checklist progress | No | Own | Own | Own |
| Read help requests | No | Own | Queue | Own |
| Claim/release/resolve a help request | No | No | Open or assigned to self | No |
| Submit a PR | No | Own | Own | Own |
| Read contribution records | No | Own | Own | All for verification |
| Verify a PR | No | No | No | Another participant's PR |
| Read opt-in public progress RPC | Yes | Yes | Yes | Yes |

### Role bootstrap

Signup creates a profile with consent off and no elevated roles. User metadata is never used for authorization. After a real user signs up, a trusted database administrator can assign a role in the SQL editor:

```sql
-- Replace this placeholder with the existing user's auth UUID.
insert into public.user_roles(user_id, role)
values ('REPLACE_WITH_EXISTING_AUTH_USER_UUID'::uuid, 'curator')
on conflict do nothing;

-- Grant a mentor independently:
insert into public.user_roles(user_id, role)
values ('REPLACE_WITH_EXISTING_AUTH_USER_UUID'::uuid, 'mentor')
on conflict do nothing;
```

There is no public role-assignment RPC. Curators cannot grant roles, and modifying profile data cannot promote a user. Revoke a role with an administrator-only delete from `user_roles`; handle any outstanding mentor assignments before removing the mentor role.

### Help transitions

Participants create an `open` request and can edit its blocker while open. They can cancel their own open or claimed request. Mentors may claim open requests only for themselves, release their own claimed requests, or resolve them. Resolved and cancelled requests are terminal.

Use a conditional update when claiming:

```sql
update public.help_requests
set status = 'claimed', assigned_mentor_id = auth.uid()
where id = :request_id and status = 'open'
returning id;
```

One returned row means success. Zero means the request is unavailable or inaccessible; refresh the queue. RLS and transition guards also enforce the assignment restriction. Native PostgreSQL CI tests verify a competing claim waits on the first transaction, then returns zero rows.

### PR verification

Participants can submit and edit their PR URL only while its status is `submitted`. A curator can update another user's status to `merged` or `closed`; a trigger fills `verifier_id` and `verified_at`. A curator can return a contribution to `submitted` to correct a verification, clearing the verification fields. Curators cannot edit another participant's PR URL or self-verify their own submission. The database stores a manual verification decision; it does not contact GitHub or prove the external PR is merged.

### Archives and public progress

Archived opportunities leave the visitor directory and cannot be edited. Participants with existing checklist progress, help requests, or contributions can still read the instructions and continue. New participants cannot begin an archived opportunity. Published checklist rows cannot be deleted, and archived checklist content cannot be changed. Use archival for task removal.

`public.get_public_progress(page_size)` returns only `display_name`, `pr_url`, `status`, and `submitted_at`, filtered by current profile consent. It never returns emails, participant IDs, skills, blockers, mentor identities, or verifier details. The page size defaults to 50 and is clamped to 1–100. Revoking consent removes the user's rows from subsequent RPC calls. This initial RPC serves the recent board; pagination is a later UI concern.

## Opportunity starts and checklist details

`20261014235500_opportunity_checklists.sql` adds the eighth table, `opportunity_participations`, with own-only SELECT and no client insert/update/delete grants. Starting a task writes an owner-derived durable marker. Existing progress, help, and contribution records are backfilled into markers, and a progress-insert trigger preserves a start for direct API inserts as well. Clearing every completion no longer removes an existing participant's archived-task access.

`start_opportunity(wanted)` uses narrowly scoped definer privileges to write this otherwise read-only table. It derives ownership from `auth.uid()`, checks publication or existing archived participation, and takes a shared row lock that conflicts with archival updates. New starts waiting behind archival are rejected once that transaction commits. No caller-supplied participant ID is accepted.

`set_checklist_step(wanted,step,completed)` uses invoker privileges and existing progress RLS, verifies step membership, and sets explicit desired completion (rather than toggling). Repeat completion requests are idempotent. The insert trigger locks and checks the task before recording a start and completion in the same transaction. An incomplete request deletes only the actor's completion.

`get_opportunity_detail(wanted)` is an invoker-security read with explicit published/existing-archived filtering, even for curators. It returns ordered steps and only the caller's completion flags; there are no participant IDs, timestamps, or other people's progress in the response. The narrow `private.step_is_completed` helper reads only the current actor's completion, avoiding anonymous SELECT grants on private progress. All new functions have fixed empty search paths, explicit execute grants, and no authorization from profile metadata.

## Public opportunity directory

`20261014223000_opportunity_directory.sql` adds `browse_opportunities(search_query, skill_filter, type_filter, difficulty_filter, page_number)`. It uses invoker security and a fixed empty search path, retains RLS, and explicitly selects only published opportunities for every caller. Execute permission is limited to `anon` and `authenticated` (plus the function owner); it has no write operations.

The RPC returns a narrow card projection, total matching count, current page, page count, and skills from published tasks only. Filters combine with AND; search is a literal case-insensitive substring of title, summary, and skills. Skill matching is case-insensitive and exact after trimming. Pages contain at most 12 records, ordered by newest creation timestamp then ID. Out-of-range page numbers clamp to available pages. See `OPPORTUNITY-DIRECTORY.md` for the UI.

## Fictional fixtures

`supabase/seed.sql` includes clearly labelled demo tasks and `example.invalid` links. Automatic seeding is disabled, so database reset does not publish fictional tasks by default. The automated tests load them into disposable databases. Apply the fixture manually only to a local disposable environment when needed. It contains no accounts, credentials, or real participant data.

## Tests

```sh
npm run test:db
npm run check
```

By default the tests execute the migration in PGlite, an embedded PostgreSQL engine. The harness creates Supabase-shaped `auth.users` and `auth.uid()` stubs and simulates broad default grants so explicit revocations are tested. It changes the database role and the session user claim for each actor; it does not test JWT signature validation, GoTrue, or the PostgREST HTTP layer.

CI also runs the same suite against a fresh PostgreSQL 17 service using `FIRSTPR_TEST_DATABASE_URL`, including a simultaneous-claim test that requires two native database connections. **Never point this variable at a real application database:** the harness creates auth stubs and test roles. The concurrent test is skipped in PGlite because it uses one connection.

Before a hosted pilot, repeat the access checks through a real Supabase development project with actual authenticated sessions. This is additional integration validation, not a reason to bypass database controls.

## Provider references

- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Supabase function security](https://supabase.com/docs/guides/database/functions)
