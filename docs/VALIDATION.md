# End-to-end validation

Run `npm ci`, `npx playwright install --with-deps chromium`, then
`FIRSTPR_E2E_PRODUCTION=1 npm run test:e2e`. This builds the release application
with disposable fixture configuration before starting it. `npm run test:e2e`
alone uses the development server. Neither command uses hosted Supabase data.
Do not run a development server or a second build concurrently in this checkout.

The browser fixture simulates GitHub OAuth and Supabase HTTP responses; database
operations execute the real migrations, RPCs and RLS in disposable PGlite.
It cannot establish that GitHub or hosted Supabase configuration works.
`npm run check` runs input, database and build checks; CI additionally runs the
same database suite on a fresh PostgreSQL 17 service, including simultaneous
claim and archive locking tests that PGlite cannot exercise.

## Acceptance coverage

| Requirement | Automated evidence |
| --- | --- |
| Complete participant → mentor → curator → board flow | `journey-accessibility.spec.ts`: one participant starts a task, updates a checkbox using Space, gets private guidance and resolution, submits a PR, receives manual verification, opts in and sees the signed-out board update |
| Session and profile recovery | `auth.spec.ts`, plus journey validation retaining edited skills and experience |
| Owner and elevated-role boundaries | Auth, help, mentor, curator, contributions and progress browser specs; database policies and forged-owner tests |
| Claim races and stale decisions | Mentor browser stale claim, native PostgreSQL concurrent claim; curator/contribution stale edit and review cases |
| Meaningful failure recovery | Directory, help, mentor, contribution and progress provider failures, draft preservation, retry and expired sessions |
| Labels and contrast | Full-page axe WCAG 2.1 A/AA scans across public pages, onboarding, profile validation, checklist, help, mentor queue/response, curator editor/review, submission and progress |
| Keyboard and mobile | Skip link focus, Space checklist activation and retained focus, textarea focus outline, 390px scans/overflow assertions; existing feature specs also exercise mobile |

CI uploads `browser-validation` for 14 days, including the HTML report, full axe
JSON attachments, mobile screenshots and failure traces/screenshots. Use
`npx playwright show-report` locally to inspect the report. Axe rules are not
suppressed. These checks are regression evidence, not a WCAG conformance claim.

## Real-provider and manual pilot checks

Before calling the hosted MVP pilot validated, use dedicated participant, mentor
and curator test accounts against the deployed app, and repeat the connected
journey with real GitHub sign-in. Confirm redirect URLs, refresh/reload, logout
across tabs, and expected role assignments. Verify the linked PR manually against
GitHub; the application records a curator decision, not automatic GitHub state.

Manually test keyboard navigation through the full flow, screen-reader labels,
validation and status announcements (for example NVDA/Firefox or VoiceOver/Safari),
200% text zoom, 400% browser zoom/reflow, mobile touch targets and focus visibility.
Include disabled, pending, empty and error states. Automated Chromium/axe checks
do not replace these assistive-technology and real-provider checks.
