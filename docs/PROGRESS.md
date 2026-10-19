# Participant dashboard and public progress

Issue #11 expands `/dashboard` into an own-only contribution overview and adds an opt-in board at `/progress`.

## Private dashboard

The dashboard shows started tasks, completed/total checklist steps, help counts by status, and PR counts for submitted, merged and closed records. Each task shows its own checklist and active-help summary, plus PR status counts and a link back to its instructions. Started tasks include archived work that the participant can continue. Twelve task cards are shown per page, ordered by start date then ID.

The invoker-security `get_participant_dashboard(page_number)` RPC derives the participant from `auth.uid()` and explicitly filters every participation, help, progress and contribution query by that owner. Mentor queue reads and curator verification permissions never broaden this participant view. Historical direct API records also establish task history through their own progress/help/contribution records; clearing a checklist does not remove durable starts.

Task checklists and help text are not made public by the visibility setting. The dashboard uses aggregates instead of rendering blockers or mentor notes; request and contribution screens remain available for details.

## Public board

`get_public_progress_board(page_number,status_filter)` exposes only four fields per entry: display name, PR URL, recorded status, and submission date. It reads only participants whose current `public_board_consent` is true. The page shows separate submitted, merged and closed counts across all consented records, independent of page and selected status filter. The matching total and pagination apply the selected filter. There are 20 entries per page, ordered by submission date and internal ID; internal IDs never enter the response.

This is a recent feed, not a ranking. There are no points, leaderboards or per-person scores. “Merged” includes automatically confirmed GitHub completions and curator decisions. “Closed” remains a curator decision. Public counts use the stored status. Closed means closed without merging.

The public RPC uses narrowly scoped definer access because visitors cannot SELECT private profiles or contributions. It has a fixed empty search path, no user-ID parameter, no mutations, and explicit execute grants to anon/authenticated only. Direct anonymous access to private tables remains denied. Runtime schemas reject unexpected fields in the public projection. The original narrow `get_public_progress(page_size)` RPC remains compatible.

## Consent and freshness

Participants opt in or out using the dashboard's visibility button or the existing profile checkbox. Both derive ownership from the validated session and ignore forged owner fields. Consent defaults off. The dashboard action sets an explicit desired value and revalidates dashboard/profile/board routes; failures preserve the current setting.

The public page is dynamically rendered with a no-store response. Counts and entries are read from one database snapshot using current consent. Opting out removes that person's entries and counts from subsequent board requests. Previously loaded pages, screenshots or copies cannot be recalled; refresh is required to see other users' changes. There are no realtime subscriptions or notifications in this feature.

## Migration and validation

`20261015132144_participant_progress.sql` adds the two RPCs, without new tables, users, role grants or sample data. Verify it first in a disposable database; apply through the project's migration workflow. The public definer function is intentionally an exposed projection, not an escape from private-table RLS.

Tests cover owner isolation for participant/mentor/curator views, archived-task continuation, bounded task and public pagination, consent withdrawal, exact public field projection, global counts with status filtering, and direct-table access denial. Browser coverage uses real migrations in the disposable contract server, with actual per-role SQL and profile consent updates, and checks the dashboard/checklist/help/PR journey, manual merge status, separate accounts, failed consent saves, forged owner IDs, profile consent, no-store responses, mobile overflow, error recovery, and expired sessions. Real-provider session and deployment validation remain pilot checks.


### Public GitHub evidence

Opted-in public cards also show automatically fetched public GitHub PR title, author, target repository, state and discussion/code-review comment counts. Consent is queried on every board request before these cards render; opting out hides both the contribution and its GitHub evidence from subsequent board requests. The public RPC projection remains unchanged. Display evidence has a five-minute cache. The trusted merge worker can separately persist matching GitHub completions, which update totals and filters; see [CONTRIBUTIONS.md](CONTRIBUTIONS.md). Public GitHub authorship is displayed as evidence, not assumed to match the FirstPR submitter.
