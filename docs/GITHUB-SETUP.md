# Publish the project foundation and backlog

These instructions are for a maintainer when the connected integration cannot write to GitHub. They require the official GitHub CLI (`gh`) installed and authenticated on your own computer. Do not put a token in this repository or share credentials in chat.

## Publish the prepared branch

If you received the source bundle, extract it into an empty folder. It includes the original repository history and a local `feat/mvp-foundation` branch; it contains no credentials or dependencies. In that folder:

```sh
git status
git remote -v
gh auth status
gh auth setup-git
git push -u origin feat/mvp-foundation
gh pr create --base main --head feat/mvp-foundation --title "Set up FirstPR project foundation" --body-file docs/FOUNDATION-PR.md
```

If a PR already exists for the branch, use it rather than creating another. Review the changes and CI before merging. The landing page's main-branch documentation links become available when the PR is merged.

## Preview and create the backlog

```sh
npm run github:setup -- --dry-run
npm run github:setup
```

The script targets **only `logboi1/firstpr`**. It checks for existing titles before creating the `MVP v0.1` milestone and the 12 tasks. It adds labels and links all tasks in a tracking issue. Run one copy at a time; GitHub does not offer atomic issue creation by title. Re-running resumes completed work without deliberately duplicating existing exact-title issues.

The setup script does not build the application or create a GitHub Projects board. The milestone and tracking issue provide the initial backlog. It never merges PRs or marks implementation tasks complete.
