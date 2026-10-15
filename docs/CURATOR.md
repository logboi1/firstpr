# Curator opportunity management

Issue #6 implements `/admin/opportunities`, `/admin/opportunities/new`, and `/admin/opportunities/[id]`. The dashboard shows a workspace link only for an account with a curator role. Pages, Server Actions, database RPCs, and RLS all enforce that role independently; hiding navigation is not the authorization boundary.

## Setup

Apply every migration in a dedicated development Supabase project, including `20261015003000_curator_management.sql`. Configure email sign-in per `AUTHENTICATION.md`, then assign an existing user the curator role using the trusted SQL bootstrap in `DATABASE.md`. There is no self-promotion or role-assignment UI. No hosted database or real account role was modified by the implementation.

## Curator workflow

1. Create a draft with a title and summary. Optional unfinished fields can remain blank. Use comma-separated skills, plain-text prerequisites/setup instructions, and one checklist step per line.
2. Save and review the draft. Rearrange or remove checklist lines while it is unpublished; saving replaces those draft steps atomically. If validation or authorization fails, entered form values stay visible.
3. Publish when the task has valid repository/issue URLs, at least one skill, setup instructions, and a checklist. Review current issue availability and contribution guidelines before publication; the app does not fetch external links or verify eligibility for event rewards.
4. Published task information can be edited, but its checklist stays locked to preserve the meaning of participant completion. For a different checklist, create a new opportunity. A published task cannot return to draft.
5. Confirm archival when removing the task from the directory. Archived records are read-only, while participants who already started retain their instructions and saved progress. Incomplete drafts may also be archived.

The list includes all statuses, a status filter, a distinct empty view, and 20-item pagination. Anonymous users go to sign-in; signed-in accounts without curator access receive a not-found page without draft data. Unknown task IDs are also not found.

## Validation and concurrency

Titles: 1–160 characters; summaries: 1–2000; skills: at most 30 entries, 60 characters each; prerequisites: up to 5000; setup: up to 10000; checklists: at most 50 nonblank steps, 500 characters each. Text is trimmed, rendered as escaped plain text, and skills are deduplicated in the application.

Links must be standard HTTPS without credentials, custom ports, whitespace, or backslashes, up to 2000 characters. The application canonicalizes links with the URL parser, and database constraints validate stored links. These checks do not prove a remote issue is open or available. No server request is made to the submitted URL.

Saves and archival include the snapshot's full-precision `updated_at`. The database locks the parent task and checks that version before writing. A stale form receives a clear error and retains typed entries; open a fresh copy and reconcile changes before saving again. Draft replacement, metadata changes, and publication either all succeed or all roll back.

## Tests

`npm run check` covers field/publication validation, unsafe URL rejection, database role boundaries, incomplete publication, rollback, stale versions, published checklist preservation, archived visibility and existing-participant access, lint, TypeScript, and the build. CI repeats the SQL suite on native PostgreSQL.

Browser tests execute the real RPCs and RLS in the disposable PGlite-backed provider stub. They cover anonymous/participant denial, curator navigation, draft creation, validation with preserved input, stale edits, publication, participant progress surviving metadata edits, archival, mobile overflow, and a curator role revoked while a form remains open. Existing authentication/directory/checklist tests remain included. This does not replace live Supabase/PostgREST and email verification before a pilot.
