# Mentor queue and guidance

Issue #9 adds `/mentor/help` and `/mentor/help/[id]`. After a trusted administrator grants `mentor` using [ROLES.md](ROLES.md), the dashboard shows **Mentor queue**. This role is independent of curator access.

## Workflow

- Filter by open, assigned to me, all claimed, resolved, cancelled, or all requests. The queue shows 20 per page, oldest first, with stable ID tie-breaking. Filters remain in the URL.
- Claim an open request. A conditional update derives the mentor from `auth.uid()`; a competing claimant gets a conflict message and must refresh.
- Open the request and send guidance while it is assigned to you. Guidance requires 1–4,000 trimmed characters. Failed actions preserve the draft; confirmed sends clear it.
- Release a claimed request when another mentor should handle it. Previously sent guidance stays in history.
- Send guidance and resolve when the blocker has been addressed. The note and resolution commit in one transaction. Resolved/cancelled requests are terminal; a participant cancellation or another state change rejects a stale response without adding a note.

Participants open **View request and mentor guidance** in `/help` to read their own responses at `/help/[id]`. Even mentors using the participant route can only see their own requests there. Guidance is paginated in groups of 20, newest first. Refresh to see changes: there are no email notifications, realtime updates, or participant chat replies in this feature.

The queue contains private blockers. Only authorized mentors see it; curators without the mentor role do not. No account emails or private profiles are exposed. Archived opportunity instructions retain their existing access restrictions; mentors can still read and handle the associated blocker and guidance if the task instructions are unavailable to them.

## Migration and authorization

Apply `20261015115437_mentor_help_queue.sql` after the existing migrations, first in a disposable development database. It adds `help_responses`, its RLS policies, explicit column grants, a parent-row-locking response trigger, and invoker-security RPCs `list_mentor_help`, `get_help_request`, and `mentor_help_action`. All have fixed empty search paths and restricted execute grants. There is no service-role application path and no role-promotion RPC.

`help_responses` is append-only for application sessions. Inserts derive the author and timestamp from database defaults; callers cannot forge either. Only a currently assigned, currently authorized mentor can insert while the request is claimed. The trigger locks the parent for direct API inserts too, preventing a response from slipping behind cancellation, release, or resolution. Author IDs stay in database audit data; the UI projection exposes guidance text, dates, and whether the current mentor wrote it.

The migration has not been applied to a hosted project by this feature implementation. Run provider advisors and real Supabase session checks in the development project before a pilot. Local advisor execution requires a running Supabase database/Docker stack; embedded and native CI authorization tests do not replace those hosted checks.

## Validation

`npm run check` covers validation, RLS/grants, live role revocation, guidance immutability/privacy, assignment restrictions, and request transitions. Native PostgreSQL CI exercises two concurrent calls to the actual claim RPC, verifies that the second waits on a row lock, and accepts only one winner. Browser contract coverage exercises two mentors, stale claim failures, sent guidance visible to the participant, release/reclaim, resolution, service failures, role revocation, cancellation races, and mobile overflow. OAuth remains covered by the existing GitHub sign-in tests.
