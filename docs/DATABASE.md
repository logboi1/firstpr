# Database schema and access

The initial migration is `supabase/migrations/20261014190000_initial_schema.sql`. It creates all seven MVP tables, enums, indexes, constraints, profile bootstrap, RLS policies, column grants, workflow guards, and a narrow public progress RPC.

Issue #3 connects the application using participant sessions; see `AUTHENTICATION.md`. The additive `20261014220000_profile_onboarding.sql` migration adds an own-editable onboarding completion flag without changing authorization roles. The FirstPR hosted project (`eoziebyvhrgpyreyilcg`) has the initial, onboarding, directory, checklist, curator and mentor and contribution-link migrations applied. Hosted migration history uses provider-generated version IDs; names identify the corresponding checked-in migrations.

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
| `help_responses` | Immutable private mentor guidance with author/time audit |

All application tables have RLS enabled. Explicit column grants prevent callers from replacing ownership IDs, timestamps, or verification metadata. All inserts use server-generated IDs and `auth.uid()` for ownership where applicable.

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

One returned row means success. Zero means the request is unavailable or inaccessible; refresh the queue. RLS and transition guards also enforce the assignment restriction. Native PostgreSQL CI tests verify a competing claim RPC waits on the first transaction, then returns a conflict.

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

## Curator management

`20261015003000_curator_management.sql` adds invoker-security CRUD/read RPCs: `list_curator_opportunities`, `get_curator_opportunity`, `save_curator_opportunity`, and `archive_curator_opportunity`. Each checks a real actor and `private.has_role('curator')`, runs under participant credentials and existing RLS, has a fixed empty search path, and exposes execute only to authenticated callers. Curators still cannot assign roles.

A draft needs a title and summary; missing links, skills, setup text, or checklist can be filled later. URL constraints permit blank links only for unpublished records and otherwise require canonical standard HTTPS links without credentials, whitespace, backslashes, or custom ports. Publishing requires setup text, 1–30 nonblank skills of up to 60 characters, valid links, and 1–50 checklist steps. Field/table constraints also apply. Lifecycle triggers enforce these rules for authenticated direct writes, disallow returning published tasks to draft, and preserve archived records.

Draft checklist replacement and metadata saves happen in one transaction. Parent row locks serialize saves, publication, step edits, and archival; expected `updated_at` timestamps reject stale edits with `40001` without partially applying them. Published checklist rows cannot be added, edited, or deleted by clients; labels and IDs retain their meaning for existing completion records. Published metadata remains editable. Archives are terminal and read-only.

Trusted SQL administrators with no application actor claim can repair or import data; RLS, RPC actor checks, and client grants still prevent anonymous or unprivileged callers using that repair path. This exception also permits labelled disposable fixtures representing existing publication history. It is not an application route or a service-role pattern. Real curator roles must be assigned using the controlled bootstrap above.

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

## Mentor queue and guidance

`20261015115437_mentor_help_queue.sql` adds the ninth table, `help_responses`, with own-request/mentor-only reads and insert-only guidance for the currently assigned mentor. A parent-row-locking trigger protects direct API inserts against cancellation and reassignment. Invoker RPCs provide filtered/paginated queue reads, explicit participant-vs-mentor request views, atomic conditional claims/releases, and transactional guidance plus resolution. Functions have fixed search paths and explicit execute grants; no new definer privileges or role grant endpoint are introduced. See [MENTOR-QUEUE.md](MENTOR-QUEUE.md) and [ROLES.md](ROLES.md).

## PR links and stale-review protection

`20261015125206_contribution_links.sql` adds canonical GitHub URL constraints and a unique index on participant plus `lower(pr_url)`, closing case-variant duplicates. It replaces the contribution update timestamp trigger with a fixed-search-path invoker function that guarantees increasing timestamps. Application edits and review decisions include the exact expected timestamp, owner/role scope and lifecycle state; existing RLS and the verification guard remain authoritative. See [CONTRIBUTIONS.md](CONTRIBUTIONS.md).

## Participant and public progress

`20261015132144_participant_progress.sql` adds invoker-security own-only dashboard aggregates and a narrowly projected definer RPC for public board pagination/counts. Both have fixed search paths and explicit execute grants. The board joins current profile consent for every call and returns no private identity, profile, help or checklist fields. No anonymous table grants are added. See [PROGRESS.md](PROGRESS.md) for count semantics, visibility controls, freshness and tests.


## Automatic GitHub merge completion

`20261019001654_automatic_github_merge_completion.sql` adds private contribution audit columns and an RLS-enabled `private.github_merge_checks` throttle ledger. The three public merge RPCs are service-role-only invoker wrappers; private definer helpers check trusted OAuth provider identity, target repository, exact PR URL and row version under locks. Participant grants are unchanged, and curator corrections retain their actor-derived audit. Automatic completions use `verification_source=github`, a null human verifier and real GitHub merge/PR/author IDs. Existing counts include these merged records without widening the public projection. The ledger does not touch contribution versions. See [CONTRIBUTIONS.md](CONTRIBUTIONS.md) for invocation timing, failure behavior and Edge deployment.


## Completed contribution closure

`20261019004423_close_completed_contributions.sql` adds `closed_at` and `closed_by` to contributions. Closure is allowed only for merged records, and the pair is either both null or both non-null. Authenticated owners/curators use the invoker `set_contribution_closed` wrapper and a private definer helper with explicit actor/ownership/role checks, an authorized row lock and expected version. Time and actor come from the guard trigger. Existing column grants and UPDATE RLS policies are unchanged; no direct client closure/audit writes are granted. Status, verification and public counts remain merged. Curator status corrections clear closure when the record is no longer merged. See [CONTRIBUTIONS.md](CONTRIBUTIONS.md).
