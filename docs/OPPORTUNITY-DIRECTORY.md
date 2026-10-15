# Opportunity directory

Issue #4 implements `/opportunities`, a public read-only directory of published tasks. Search, skill, contribution type, and difficulty combine. URL parameters preserve filters for reload, sharing, and browser history. Changing filters starts on page one; pagination retains them.

## Setup

Configure the development Supabase URL and publishable key as documented in `AUTHENTICATION.md`, then apply all migrations following `DATABASE.md`, including `20261014223000_opportunity_directory.sql`. A missing connection shows an unavailable state. A configured database with no published tasks shows a distinct empty state. Missing migrations, provider errors, or invalid response data produce retry controls, not an empty directory.

Do not publish fictional fixture tasks to a real pilot. `supabase/seed.sql` remains disabled for automatic seeding; fixtures are for a disposable environment. Real opportunities require curator review under issue #12. This feature does not claim external issues are still available or qualify for event rewards.

## Behavior

- Search is a case-insensitive literal substring of titles, summaries, and skills, limited to 120 characters. `%`, `_`, punctuation, and SQL-like text are ordinary text, not query operators.
- Skill filters match an entire skill case-insensitively. Options come from all published tasks and stay available when other filters produce zero results.
- Contribution types: code, documentation, design, testing. Difficulty: beginner, intermediate, advanced. Unknown values in a manually edited URL are ignored; invalid page values fall back to one.
- The database paginates at 12 records, with newest tasks first and ID as a stable tie-breaker. Page requests beyond the last page clamp to the last available page. Counts and cards come from one query snapshot.
- Drafts and archives never appear in cards, counts, or skill choices, even for curators. The app uses a server-only anonymous Supabase client, independently of account cookies, with uncached reads. The SQL function uses invoker security and existing row-level policies.
- Cards show skill tags, difficulty, type, summary, repository, and source issue links. External links require HTTPS, open in a new tab, and use `noopener noreferrer`. The application does not fetch those links.
- Cards now link to in-app task details and persisted checklists from issue #5, and retain source links. See `CHECKLISTS.md`.
- Loading feedback covers initial loads and changed filters through a keyed Suspense boundary. Error recovery refreshes server data while preserving the URL filters. Empty search results offer a way to clear filters.
- Forms have explicit labels, visible keyboard focus, native selects, an Apply button, and a GET fallback when JavaScript is unavailable. Mobile layout stacks controls and cards.

## Validation

`npm run check` includes parameter tests, database tests over every migration, lint, TypeScript, and a production build. Database tests verify role boundaries, combined filters, literal special-character searches, unpublished skill exclusion, stable pagination, and bounded page requests in PGlite and native PostgreSQL CI.

`npm run test:e2e` covers the directory plus authentication. The disposable localhost HTTP stub executes the real directory migration against PGlite as `anon`; it does not duplicate filter logic or connect to a hosted project. Browser tests check cards, pagination, filters, reload/back behavior, keyboard submission, empty/error/loading feedback, and mobile overflow. Real Supabase/PostgREST integration and real opportunity curation remain pilot checks.
