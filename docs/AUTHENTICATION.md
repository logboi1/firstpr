# Authentication and onboarding

Issue #3 adds GitHub OAuth sign-in/sign-up, local-session sign-out, cookie session refresh, onboarding, and own-profile editing. The dashboard is an account summary; task progress remains issue #10.

## Configure GitHub sign-in

1. Apply the migrations following `DATABASE.md`. They add the profile and onboarding schema used after sign-in.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
3. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**. Set the application name to `FirstPR`, the homepage URL to `http://localhost:3000`, and the authorization callback URL to `https://eoziebyvhrgpyreyilcg.supabase.co/auth/v1/callback`.
4. Create the app and copy its **Client ID**. Select **Generate a new client secret** and copy the secret immediately; GitHub will not show it again.
5. In Supabase, open **Authentication → Sign In / Providers → GitHub**, enable GitHub, and enter the Client ID and client secret. Save the provider. Keep the secret in Supabase; do not put it in `.env.local`, client code, or Git.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to your app and add `http://localhost:3000/auth/callback` to the allowed redirect URLs. Add the exact production callback route too, for example `https://your-app.example.com/auth/callback`.
7. Restart `npm run dev`. Open `/sign-in` and choose **Continue with GitHub**. The app exchanges the callback code for a session; profile creation is performed by the existing database signup trigger. Complete onboarding and test refresh, sign-out, and returning-user sign-in. Use a second account to verify it cannot read or update the first profile. Elevated roles still require administrator assignment.

Without environment configuration, the homepage remains usable and `/sign-in` explains the setup requirement. Protected pages redirect to sign-in. OAuth provider credentials must be configured in both GitHub and Supabase before sign-in can work.

## Security and session behavior

Server Components and Server Actions validate the user with `auth.getUser()`, including a fresh Auth-server check. The Next.js proxy refreshes sessions and propagates cookies to both the request and response; it sends `private, no-store` on account responses. Account pages are explicitly dynamic, including when built without environment variables. Authorization never trusts `getSession()` or submitted owner IDs.

Cookies are SameSite=Lax and Secure in production. The Supabase SSR defaults allow its standard session cookie integration; secrets and service-role keys are never needed. Sign-out terminates the current session only. Next.js Server Actions enforce same-origin requests; retain those defaults when deploying behind a reverse proxy.

Profile updates derive the owner ID from the validated user, allow only display name, skills, experience, consent, and onboarding completion, and run with the participant's session and database RLS. Names are trimmed and limited to 80 characters; skills are trimmed, deduplicated, limited to 30 entries and 60 characters each. Consent defaults off and is editable. Onboarding completion grants no elevated permission.

## Verification

- `npm run check`: lint, TypeScript, form-input tests, database allowed/denied tests across all migrations, production build.
- `npm run test:e2e`: Playwright against a disposable localhost Supabase contract stub. Install Chromium with `npx playwright install --with-deps chromium` first. Tests cover the OAuth callback, onboarding, returning-user routing, reload persistence, refreshed response cookies, forged owner fields, sign-out, and rejected stale-tab profile mutations. The stub does not replace live-provider validation.
- CI runs the browser contract tests separately and retains native PostgreSQL authorization tests.

Before pilot release, test real GitHub OAuth, token expiry, provider outages, and account isolation in a dedicated Supabase project. Contract tests verify the app integration, not Supabase's implementation or production deployment.


### Session-aware navigation

The homepage and public site header share a server-rendered account link. A user validated with `auth.getUser()` sees **Dashboard**, while a guest sees **Sign in**. The pending fallback says **Checking session…** so authenticated users are not briefly prompted to sign in. The homepage participates in the session-refresh proxy and returns private/no-store caching headers, preserving refreshed cookies. On a thrown provider/network failure, the control offers **My account** rather than asserting the user is signed out. Protected pages and mutations retain their own server authorization checks; the navigation link is not an access control.
