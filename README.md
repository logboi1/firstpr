# FirstPR

Helping newcomers make their first open-source contribution through curated tasks, practical guidance, and mentor support.

**Status: early development.** The project includes a responsive landing page, TypeScript, Tailwind CSS, CI, and a tested database migration with access policies. The contribution platform's UI and Supabase authentication integration are not implemented yet.

## The MVP

- Reviewed opportunities filtered by skill, difficulty, and contribution type.
- Setup guidance and per-participant contribution checklists.
- A mentor help queue with claim and resolution workflows.
- Pull-request submissions and manually verified progress.
- Curator tools and participant-controlled public visibility.

Read the [MVP plan](docs/MVP-PLAN.md) for scope, roles, data model, acceptance criteria, and delivery order. The initial backlog is also available in [machine-readable form](docs/github-backlog.json).

## Run locally

Requirements: Node.js 22 or later and npm.

```sh
git clone https://github.com/logboi1/firstpr.git
cd firstpr
npm ci
npm run dev
```

Open http://localhost:3000. No credentials or database are required for the foundation page. `.env.example` contains placeholders for future Supabase integration; filling them does not enable features that have not been built.

## Checks

```sh
npm run lint
npm run typecheck
npm run test:db
npm run build
```

`npm run check` runs all four. For production, build first, then run `npm start`.

## Database

Read [DATABASE.md](docs/DATABASE.md) for the schema, access matrix, local migration setup, role bootstrap, and test limitations. No hosted database is required to run the embedded authorization tests. Fictional fixtures are explicitly labelled and automatic seeding is disabled.

## Contribute

Start with [CONTRIBUTING.md](CONTRIBUTING.md), check the issues, and keep each PR focused. Documentation, design, testing, and code contributions are welcome.

Maintainers can populate the GitHub milestone, labels, and issues using the [GitHub setup instructions](docs/GITHUB-SETUP.md). The helper supports previewing changes before applying them.

## License

MIT. See [LICENSE](LICENSE).

FirstPR is an independent community project and is not an official Hacktoberfest service. External event eligibility is not guaranteed.
