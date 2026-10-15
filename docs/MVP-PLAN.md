# FirstPR — MVP project plan

Status: Foundation, database, authentication, and public opportunity directory implemented. Task details and saved checklists are implemented; curator management is implemented. Remaining MVP workflows are in the backlog.

## Purpose

Help Hack Day participants find a suitable open-source task, follow contribution steps, request mentor support, and record their first pull request. FirstPR itself will be open source. Build and validate the core journey together before announcing it to the group.

Repository: `logboi1/firstpr` (public). License: MIT. Do not publish credentials, participant data, or private conversations.

This is an independent community project; do not imply official Hacktoberfest affiliation or that every contribution qualifies for external event rewards.

## MVP scope

- Public directory of manually reviewed opportunities.
- Filters by skill, contribution type, and difficulty.
- Opportunity details with repository and issue links, prerequisites, setup notes, and a contribution checklist.
- Participant sign-in and profile with skills and experience.
- Per-participant checklist progress.
- Help queue with mentor claims and resolution.
- Participant submission of a GitHub pull-request URL.
- Progress board distinguishing submitted and merged contributions.
- Curator tools to create, edit, publish, and archive opportunities.

Defer automatic issue discovery, AI matching, chat, payments, certificates, GitHub status syncing, and multi-event administration. A submission remains submitted until its merge status is verified manually by a curator.

## Implementation defaults

Next.js App Router, TypeScript, Tailwind CSS, Shadcn UI, Supabase Auth and PostgreSQL, React Hook Form and Zod. Use server-side reads and mutations where appropriate. Add Zustand only if a concrete client state requirement justifies it.

GitHub OAuth sign-in is implemented and requires provider configuration. The account connection used to manage our repository is separate from the application's future GitHub OAuth integration.

Choose and pin supported dependency versions at implementation time. Include an environment example with placeholders and keep real environment files ignored. Hosting is a later decision after the app works locally.

## Main screens

| Route | Purpose |
| --- | --- |
| `/` | Explain FirstPR and open the task directory |
| `/opportunities` | Search and filter published tasks |
| `/opportunities/[id]` | Instructions, checklist, help request, and PR submission |
| `/sign-in` | Authenticate a participant |
| `/onboarding` | Set display name, skills, and experience |
| `/dashboard` | Own checklist progress, help requests, and submissions |
| `/help` | Own private participant requests |
| `/help/[id]` | Own request and mentor guidance |
| `/mentor/help` | Mentor queue and request handling |
| `/progress` | Opt-in public contribution board |
| `/admin/opportunities` | Curator opportunity management |

## Roles and access

Visitors see published opportunities. Participants manage their own profile, checklist progress, help requests, and PR submissions. Mentors can read the help queue, claim available requests, and resolve requests assigned to them. Curators manage opportunities and manually verify PR status. Grant elevated roles through a controlled administrative process; users must not be able to promote themselves.

Enforce access on the server and in Supabase row-level security policies. Never rely on hiding buttons for authorization. Private help request text must not appear on the public progress board. Public participation is opt-in, with display name and PR link only.

## Initial data model

| Table | Key fields |
| --- | --- |
| `profiles` | auth user ID, display name, skills, experience, public-board consent |
| `user_roles` | user ID, role; protected from participant writes |
| `opportunities` | title, summary, skills, contribution type, difficulty, repository URL, issue URL, prerequisites, setup notes, publication status, creator |
| `checklist_steps` | opportunity ID, label, position |
| `checklist_progress` | participant ID, checklist step ID, completed timestamp |
| `opportunity_participations` | participant ID, opportunity ID, durable start timestamp |
| `help_requests` | participant ID, opportunity ID, blocker text, status, assigned mentor ID, timestamps |
| `contributions` | participant ID, opportunity ID, PR URL, status, verifier ID, verification timestamp |

Add foreign keys and unique constraints for one progress row per participant/step and duplicate PR prevention per participant. Help states: open, claimed, resolved, cancelled. Contribution states: submitted, merged, closed. Opportunity states: draft, published, archived. Keep instructions intact for existing participants after archival.

## GitHub backlog

Create milestone `MVP v0.1`. Use labels `setup`, `frontend`, `backend`, `documentation`, `accessibility`, and `testing`. Apply `good first issue` only to reviewed, well-scoped tasks with clear prerequisites.

### 01 — Repository foundation

Create the Next.js TypeScript app, scripts, ignored environment files, README, MIT license, CONTRIBUTING guide, issue templates, and PR template. Add CI for lint, type checking, and production build. Document setup from a clean clone.

Acceptance: a new contributor can install dependencies and run the app following the README; no secrets are committed; required checks pass.

### 02 — Schema, migrations, and access policies

Implement the data model, migrations, and sample fictional data. Add row-level security policies and a controlled role bootstrap process.

Acceptance: visitors cannot read drafts or help requests; participants cannot access another user's private records or change roles; mentors cannot edit opportunities; curators can manage opportunities. Verify allowed and denied operations with representative accounts.

### 03 — Authentication and onboarding

Implement sign-in, sign-out, profile creation, protected routes, and display name/skills/experience editing.

Acceptance: refresh preserves the session; unauthenticated mutations fail; returning users reach their dashboard; users cannot edit another profile.

### 04 — Opportunity directory

Implement published task cards, search, filters, empty states, loading states, and error recovery.

Acceptance: combining filters produces the expected results; drafts stay hidden; the page works on mobile and with keyboard navigation.

### 05 — Opportunity detail and checklist

Show prerequisites, setup instructions, repository/issue links, and ordered checklist steps. Persist progress per signed-in participant.

Acceptance: progress survives refresh; another participant's checklist remains independent; an archived task can no longer be selected as a new opportunity.

### 06 — Curator opportunity management

Build create/edit forms, checklist editing, publishing, and archiving. Validate fields and external URLs.

Acceptance: only curators can mutate opportunities; incomplete drafts cannot be published; archived opportunities disappear from the public directory.

### 07 — Participant help requests

Allow a participant to describe a blocker for an opportunity and view or cancel their requests.

Acceptance: the blocker is required; participants see only their own private requests; resolved or cancelled requests cannot be claimed.

### 08 — Mentor queue and claims

Add queue filters, atomic claims, release, and resolution for assigned mentors.

Acceptance: if two mentors claim simultaneously, only one succeeds; participants cannot claim requests; mentors cannot resolve another mentor's assigned request.

### 09 — Pull-request submission and verification

Accept canonical GitHub PR links with inline validation. Record submitted status. Let curators verify merged or closed status against GitHub manually.

Acceptance: invalid links and duplicates are rejected; participants cannot mark their own PR merged; verification records the curator and timestamp. No external status is implied to be automatically synchronized.

### 10 — Participant dashboard and public progress

Show personal active tasks, checklist progress, help status, and contribution status. Build an opt-in public board with separate submitted and merged counts.

Acceptance: the board exposes no email address or blocker text; opting out removes the participant's public entries; counts reflect the stored statuses correctly. Avoid competitive rankings that reward trivial submissions.

### 11 — End-to-end validation and accessibility

Validate the real journey: sign in → choose a task → update checklist → request help → mentor claims/resolves → submit PR → curator verifies → board updates. Cover role boundaries, claim races, failures, and mobile layouts.

Acceptance: core workflow succeeds, authorization checks reject forbidden actions, forms have labels, keyboard focus is visible, and meaningful errors explain recovery.

### 12 — Pilot preparation and release

Curate a small set of real opportunities after checking contribution guidelines, setup requirements, and current issue availability. Use fictional fixtures before this review. Invite a small pilot only when the core workflow passes validation.

Acceptance: README accurately describes implemented features, known limitations are documented, a newcomer can complete the flow, mentors can use the queue, and the demo uses no real private data. Publish a group announcement only after the user requests it.

## Delivery order

1. Foundation, schema, and authentication: tasks 01–03.
2. Complete the participant task journey: tasks 04–06.
3. Add mentor support: tasks 07–08.
4. Record and showcase contributions: tasks 09–10.
5. Validate and run a pilot: tasks 11–12.

This is a multi-session MVP. A one-day prototype may demonstrate the directory and checklist, but the authenticated mentor/curator workflow needs further implementation and validation.

## Collaboration workflow

Use a feature branch and PR for each focused task. Keep acceptance criteria in GitHub issues, include validation evidence in each PR, and update the README as features land. The user owns product decisions and repository administration; the assistant can implement changes, investigate failures, and prepare reviewable PRs when account tools permit.

First implementation task after repository access: task 01, followed by task 02. Do not create a second repository if `firstpr` already exists without checking its purpose.

## Current implementation status

The foundation adds a Next.js landing page, a 404 page, development scripts, CI, contribution templates, and this plan. The initial database migration and authorization tests are implemented; see `docs/DATABASE.md`. Authentication integration, onboarding, and own-profile editing are implemented. The public opportunity directory includes published cards, combined filters, URL state, and pagination. Task details and saved contribution checklists are implemented. Curator management is implemented. Participant help requests and mentor queue/guidance are implemented. PR submission and verification, the progress board, and hosted pilot validation remain pending.

The landing page describes planned behavior and links to GitHub. It does not contain sample opportunities presented as real ones. No production database or hosted deployment is configured.

See `docs/GITHUB-SETUP.md` to publish the milestone and backlog when integration permissions are unavailable.
