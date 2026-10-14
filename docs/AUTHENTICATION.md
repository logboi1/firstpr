# Authentication and onboarding

Issue #3 adds email-code sign-in/sign-up, local-session sign-out, cookie session refresh, onboarding, and own-profile editing. The dashboard is an account summary; task progress remains issue #10. GitHub OAuth is not included.

## Configure a development Supabase project

1. Apply both migrations following `DATABASE.md`. The new migration adds `profiles.onboarding_completed` with a false default. Existing accounts complete onboarding once. The flag is a preference, not an authorization role.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your development project. Use a publishable key, never a service-role key.
3. Enable the Email provider and allow new sign-ups. Configure the project's Site URL for the development app. In **Authentication → Email Templates → Magic Link**, include the code:

   ```html
   <h2>Sign in to FirstPR</h2>
   <p>Your sign-in code is: <strong>{{ .Token }}</strong></p>
   <p>Enter this code in the FirstPR tab where you requested it.</p>
   ```

   FirstPR verifies the code directly; it has no email-link callback route. Configure the OTP length between 6 and 10 digits and review expiration/rate limits. Supabase's default email delivery has restrictions; use authorized test addresses or configure SMTP before inviting a pilot.
4. Restart `npm run dev`. Open `/sign-in`, request a code, and copy it from the email into the same page. For a local Supabase stack, use its email inbox. Profile creation is performed by the existing database signup trigger after authentication creates the user.
5. Complete onboarding and check refresh, sign-out, and returning-user sign-in. Use a second account to verify it cannot read or update the first profile. Elevated roles still require administrator assignment.

Without environment configuration, the homepage remains usable and `/sign-in` explains the setup requirement. Protected pages redirect to sign-in. No hosted project was configured or changed by this implementation.

## Security and session behavior

Server Components and Server Actions validate the user with `auth.getUser()`, including a fresh Auth-server check. The Next.js proxy refreshes sessions and propagates cookies to both the request and response; it sends `private, no-store` on account responses. Account pages are explicitly dynamic, including when built without environment variables. Authorization never trusts `getSession()` or submitted owner IDs.

Cookies are SameSite=Lax and Secure in production. The Supabase SSR defaults allow its standard session cookie integration; secrets and service-role keys are never needed. Sign-out terminates the current session only. Next.js Server Actions enforce same-origin requests; retain those defaults when deploying behind a reverse proxy.

Profile updates derive the owner ID from the validated user, allow only display name, skills, experience, consent, and onboarding completion, and run with the participant's session and database RLS. Names are trimmed and limited to 80 characters; skills are trimmed, deduplicated, limited to 30 entries and 60 characters each. Consent defaults off and is editable. Onboarding completion grants no elevated permission.

## Verification

- `npm run check`: lint, TypeScript, form-input tests, database allowed/denied tests across all migrations, production build.
- `npm run test:e2e`: Playwright against a disposable localhost Supabase contract stub. Install Chromium with `npx playwright install --with-deps chromium` first. Tests cover invalid code, onboarding, returning-user routing, reload persistence, refreshed response cookies, forged owner fields, sign-out, and rejected stale-tab profile mutations. The stub sends no email and does not replace live-provider validation.
- CI runs the browser contract tests separately and retains native PostgreSQL authorization tests.

Before pilot release, test real email delivery, token expiry, provider outages, and account isolation in a dedicated Supabase project. Contract tests verify the app integration, not Supabase's implementation or production deployment.
