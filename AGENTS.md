# Working on FirstPR

- Read `README.md` and `docs/MVP-PLAN.md` before implementation.
- Keep changes focused on an issue and use feature branches with reviewable PRs.
- Preserve existing work; do not overwrite unrelated changes.
- Distinguish implemented behavior from planned functionality in UI and documentation.
- Use TypeScript and the Next.js App Router. Keep secrets out of client code and Git history.
- Enforce future data authorization on the server and through row-level security, never through UI visibility alone.
- Run `npm run check` after code or configuration changes. For data access changes, add meaningful allowed/denied access checks.
- Read `docs/DATABASE.md` before changing migrations. `FIRSTPR_TEST_DATABASE_URL` must target a fresh disposable test database; never use production credentials for the harness.
- Do not claim browser verification or a live deployment without evidence.
- Keep the project independent; do not imply official Hacktoberfest affiliation.
