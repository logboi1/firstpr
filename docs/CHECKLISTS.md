# Opportunity details and contribution checklists

Issue #5 adds `/opportunities/[id]`: prerequisites, plain-text setup instructions, safe repository/issue links, ordered steps, and saved participant progress. Published tasks are readable without sign-in. Starting and saving require a validated authenticated session. Sign-in currently follows the normal onboarding/dashboard flow; reopen the task from the directory afterward.

Apply all migrations following `DATABASE.md`, including `20261014235500_opportunity_checklists.sql`. No hosted database was changed by the implementation. A missing connection shows an unavailable message; invalid IDs, missing tasks, drafts, and inaccessible archives use a common task-unavailable screen. Provider failures use the directory retry boundary.

## Progress and archives

- Start this task records participation even before completing a step. It is safe to repeat.
- Checkboxes save an explicit desired state. They show pending/error feedback and reflect the server's confirmed value. A failed write does not imply completion.
- Each participant's progress is independent. Mutations derive identity from a freshly validated Supabase session and database `auth.uid()`; submitted participant IDs are ignored.
- Completing every step does not submit a pull request, verify a merge, or meet external event eligibility. Those workflows remain separate backlog tasks.
- Archives are absent from the public directory. New participants cannot start them, including during a race with archival. Existing participants can follow a saved task URL, read instructions, and continue changing their own progress.
- Durable participation records preserve archive access after every step is marked incomplete. Existing workflow records are backfilled. A database trigger preserves a start for direct progress inserts too; ordinary clients cannot forge or delete starts.
- A task can be started even if its checklist is empty. The page explains that no steps have been added.
- There is no abandon/delete-participation feature in this issue. Started-task dashboard lists remain issue #10.

Setup text is rendered as escaped plain text with line breaks preserved, not executable HTML. Source links open in a new tab with `noopener noreferrer`. The page has native checkboxes, visible keyboard focus, a labelled progress bar, and a responsive single-column layout on mobile. Reads are dynamic and account-aware; the proxy refreshes cookies and adds `private, no-store` to opportunity responses.

## Validation

`npm run check` covers mutation input validation, lint, TypeScript, all migrations and database allowed/denied tests, and the production build. Database tests cover visitor reads, owner isolation, mismatched steps, unpublished/archived starts, duplicate completion requests, immutable participation records, and archive access with zero completed steps. Native PostgreSQL CI additionally tests a start blocked behind an archival transaction.

The Playwright suite uses disposable localhost auth identities and executes actual SQL functions in PGlite under transaction-scoped `anon`/`authenticated` roles. It tests public instructions, invalid IDs, two independent accounts, completion persistence after reload, archived continuation, keyboard interaction, mobile overflow, and stale-session mutation rejection. Auth/directory regressions remain included. This does not replace a real Supabase/PostgREST pilot check with real email delivery.
