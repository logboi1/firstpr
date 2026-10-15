# Pull-request submission and manual verification

Issue #10 adds participant submissions at `/contributions`, a task-specific submission form at `/contributions/new?opportunity=...`, and a curator review queue at `/admin/contributions`.

Participants choose **Submit a pull request** on an available task. A PR link must have the form `https://github.com/owner/repository/pull/123`: HTTPS, github.com, a repository path and positive PR number, without credentials, custom ports, query strings, fragments or a trailing slash. Input is trimmed and owner/repository case is normalized to lowercase. Syntactic validation does not prove existence, ownership, task relevance or merge status.

Submissions start as `submitted`. A participant can edit only their own submitted PR link. Ownership, status, verifier and audit fields are never taken from the form. A task start is recorded before creation, preserving archived-task participation. If the insert fails, the task remains started and the link stays in the form. Existing participants can submit on archived tasks; new participants cannot begin them.

Duplicate PRs for one participant are rejected across tasks, including owner/repository case variants. Different participants can record the same link, but a curator must check authorship before verifying either. Submitted links remain editable; verified links are locked until a curator returns the record to submitted.

## Curator review

The dashboard and opportunity workspace link to **Review pull requests**. A curator opens the PR on GitHub and manually checks the author, target repository, task relevance and current status. The app does not call GitHub or synchronize status automatically.

- **Merged on GitHub** records `merged`.
- **Closed without merging** records `closed`.
- **Return to submitted** corrects a previous verification and clears its verifier/time audit.

The confirmation checkbox must be checked for each decision. The database derives the verifier UUID and verification timestamp. A curator cannot verify their own submission or edit another participant's PR URL. Mentor access does not grant verification permission. Both participant and curator lists have status filters and pagination, 20 per page; the participant screen remains own-only even for curators. Private profiles/emails are not exposed by the review queue.

Saves include the record's exact `updated_at`. A changed link, another curator's decision, or a concurrent edit causes a stale form to fail; reload and check the PR again. The contribution update trigger guarantees distinct timestamps even for rapid writes. Failures preserve participant input. Pending buttons prevent ordinary double submissions, while database uniqueness remains authoritative.

## Schema and validation

`20261015125206_contribution_links.sql` adds a case-insensitive unique index per participant, stricter GitHub URL constraints, and a contribution-only monotonic timestamp trigger. It retains the existing ownership RLS, grants and verification guard. It does not contact GitHub, create users, grant roles, or publish private data. Existing incompatible records or case-variant collisions cause migration failure rather than silent deletion.

Tests cover allowed/denied ownership, canonical duplicates, forged verification fields, self-verification, stale versions, role revocation, verified-link locks, audit creation/reset, failed-save retention, status filters, mobile overflow, logout, and browser integration. Native PostgreSQL CI supplements the embedded database suite. Real GitHub/Supabase session validation remains a pilot task.
