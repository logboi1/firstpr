# Contributing to FirstPR

FirstPR helps newcomers get started in open source. Documentation, design, testing, accessibility feedback, and code are all welcome.

## Before you start

Read the [MVP plan](docs/MVP-PLAN.md) and check existing issues. Comment on an issue to discuss your approach before beginning a large change. Do not assume a task is available because it has a beginner label; check the current discussion.

## Local setup

Install Node.js 22 or later, fork and clone the repository, then run:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The foundation page needs no secrets or database. Supabase integration is a future task; `.env.example` documents its intended public configuration.

## Make a change

1. Create a focused feature branch.
2. Make the change and update relevant documentation.
3. Run `npm run check`.
4. Submit a pull request explaining the change, related issue, and validation.

For a UI change, include desktop and mobile screenshots when possible. Mention limitations honestly. Never commit credentials, private participant data, or generated build output. Use placeholder or fictional data when demonstrating features.

## Review and conduct

Be respectful, explain feedback clearly, and ask questions freely. Prefer useful, scoped improvements over cosmetic PRs submitted only to increase contribution counts. This project cannot guarantee that contributions qualify for external events or rewards.
