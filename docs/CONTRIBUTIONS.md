# Pull-request submission, GitHub evidence and curator verification

Issue #10 adds participant submissions at `/contributions`, a task-specific submission form at `/contributions/new?opportunity=...`, and a curator review queue at `/admin/contributions`.

Participants choose **Submit a pull request** on an available task. A PR link must have the form `https://github.com/owner/repository/pull/123`: HTTPS, github.com, a repository path and positive PR number, without credentials, custom ports, query strings, fragments or a trailing slash. Input is trimmed and owner/repository case is normalized to lowercase. Syntactic validation does not prove existence, ownership, task relevance or merge status.

Submissions start as `submitted`. A participant can edit only their own submitted PR link. Ownership, status, verifier and audit fields are never taken from the form. A task start is recorded before creation, preserving archived-task participation. If the insert fails, the task remains started and the link stays in the form. Existing participants can submit on archived tasks; new participants cannot begin them.

Duplicate PRs for one participant are rejected across tasks, including owner/repository case variants. Different participants can record the same link, but a curator must check authorship before verifying either. Submitted links remain editable; verified links are locked until a curator returns the record to submitted.

## Curator review

The dashboard and opportunity workspace link to **Review pull requests**. A curator opens the PR on GitHub and manually checks the author, target repository, task relevance and current status. The app automatically reads public PR evidence from GitHub alongside the stored submission. Curator decisions and aggregate counts are still recorded separately; GitHub evidence never writes a verification audit or changes database status.

- **Merged on GitHub** records `merged`.
- **Closed without merging** records `closed`.
- **Return to submitted** corrects a previous verification and clears its verifier/time audit.

The confirmation checkbox must be checked for each decision. The database derives the verifier UUID and verification timestamp. A curator cannot verify their own submission or edit another participant's PR URL. Mentor access does not grant verification permission. Both participant and curator lists have status filters and pagination, 20 per page; the participant screen remains own-only even for curators. Private profiles/emails are not exposed by the review queue.

Saves include the record's exact `updated_at`. A changed link, another curator's decision, or a concurrent edit causes a stale form to fail; reload and check the PR again. The contribution update trigger guarantees distinct timestamps even for rapid writes. Failures preserve participant input. Pending buttons prevent ordinary double submissions, while database uniqueness remains authoritative.

## Schema and validation

`20261015125206_contribution_links.sql` adds a case-insensitive unique index per participant, stricter GitHub URL constraints, and a contribution-only monotonic timestamp trigger. It retains the existing ownership RLS, grants and verification guard. It does not contact GitHub, create users, grant roles, or publish private data. Existing incompatible records or case-variant collisions cause migration failure rather than silent deletion.

Tests cover allowed/denied ownership, canonical duplicates, forged verification fields, self-verification, stale versions, role revocation, verified-link locks, audit creation/reset, failed-save retention, status filters, mobile overflow, logout, and browser integration. Native PostgreSQL CI supplements the embedded database suite. Real GitHub/Supabase session validation remains a pilot task.


## Automatic public GitHub evidence

After saving a PR link, participant and curator cards automatically look it up using the GitHub REST `GET /repos/{owner}/{repo}/pulls/{number}` endpoint. The opt-in public progress board shows the same evidence, only after reading the current consent-filtered board RPC. Each card displays the PR title, actual GitHub author, target repository, open/draft/merged/closed state, discussion-comment count, code-review-comment count, GitHub update time and snapshot time. A PR with no comments remains a real PR; comments are activity, not approval. The check does not establish that the submitter owns the GitHub account or that the work matches the task. Curators must still check both.

Lookups are server-only, restricted to canonical github.com PR paths on the fixed api.github.com host, have a five-second timeout and refuse redirects. Response schema validation requires an explicitly public repository, a matching canonical PR URL and matching target repository. Only sanitized public evidence is cached (including unavailable states), for five minutes across viewers; no private profile, consent, participant data or raw GitHub payload is cached. Cached snapshots revalidate on subsequent visits after expiry; there is no background job, webhook or continuously updating open-tab feed. Updating a PR URL keys a new lookup. Existing manual status filters and counts retain their meaning, so GitHub can report merged while curator-recorded status is still submitted.

Missing/private PRs, malformed or mismatched data, network timeouts and GitHub rate limits show an explicit unavailable state. They neither discard the submitted link nor imply a successful verification. A cached public observation disappears from subsequent public board requests when consent is revoked because consent is checked outside the evidence cache.

No migration or extra OAuth permissions are required. Without configuration, lookups use GitHub's unauthenticated public API limit (60 requests per hour per server IP). Set optional **server-only** `GITHUB_PUBLIC_READ_TOKEN` to a fine-grained token with public read-only access for higher limits. Never use a `NEXT_PUBLIC_` variable or a participant's Supabase/provider token for this. Private repository responses are rejected even if a misconfigured credential can read them. For a larger deployment, a GitHub App and budget-aware background synchronization remain future work.

References: [GitHub PR API](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request), [API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

Tests cover public-only schema validation, fixed-host URL handling, all lifecycle states, zero/comments, error responses, timeout handling, cache reuse, link edits, separation from curator audit/counts, consent removal, mobile overflow and accessibility. Browser tests preload a test-only GitHub fetch adapter pointing at the disposable fixture; production code contains no fixture switch and always uses api.github.com.
