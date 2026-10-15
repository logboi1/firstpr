# Participant help requests

Issue #8 adds private participant support at `/help`. From an available opportunity, choose **Request help**, describe a blocker, then send it. The form trims the description and requires 1–4,000 characters. Failed submissions retain the typed text. Do not include credentials or other secrets.

The request list shows only the signed-in participant's requests, including when that person also has a mentor or curator role. Each entry includes the task, full blocker, status, and creation/update dates in UTC. History is paginated in groups of 20. The page has loading, empty and retryable error states.

Participants can cancel their own open or claimed requests. Resolved and cancelled requests are terminal and have no cancellation button. Server actions revalidate the user, ignore submitted ownership/assignment/status fields on creation, and scope cancellation to the validated user and an active state. The existing RLS and workflow guard enforce the same boundaries for direct API access. Concurrent resolution wins safely over a stale participant cancellation.

A successful start RPC records durable task participation before saving a request. It locks against archival and rejects new participants on archived tasks. Existing participants can ask for help on archived tasks. If the later request insert fails, the task remains started and the blocker remains in the form; retrying the request does not erase that participation.

Requests are visible only to their participant and authorized mentors; public-board consent does not expose blockers. Mentor claim, response and resolution UI is a separate backlog item (#9). This feature sends no notifications and does not promise a mentor response.

No additional migration or hosted database change is required. Apply the existing checked-in migrations, including opportunity starts, in the configured development environment.

Validation includes input-boundary tests, allowed/denied PostgreSQL ownership and terminal-state tests, and a browser contract test covering separate accounts, forged ownership/request IDs, claimed cancellation, resolved history, service failures, mobile overflow, and expired-session denial. The contract server uses the actual migrations under authenticated database roles; it does not replace testing actual sessions against a Supabase development project.
