# FirstPR workshop design

The interface takes its cues from community hack days, printed task sheets and
small pull requests. Warm paper and ink keep the app welcoming; green marks work
and progress, mustard marks entry points, and restrained peach adds personality.
There are no invented community statistics or simulated live tasks on the home
page. Its contribution checklist is explicitly labelled as an illustration.

## Shared foundations

`src/app/globals.css` owns the colours, spacing, surfaces and native form controls.
Space Grotesk is self-hosted through a pinned font package; small metadata uses the
system monospace stack. Font loading needs no external Google Fonts requests.

- `Brand` renders the shared SVG mark and wordmark.
- `SiteHeader`, `SiteNavigation` and `SiteFooter` provide common navigation and branding.
- `AccountShell` and `DirectoryShell` apply these across all role workspaces.
- Navigation marks the current route with `aria-current`. The sign-in/onboarding
  header uses the public navigation, avoiding a row of unfinished account actions.
- Forms use real inputs, selects, textareas and checkboxes. Native select menus
  retain OS and keyboard behaviour; their closed controls share a chevron,
  padding, typography and focus treatment.
- Explicit invalid states, visible labels, helper text, disabled states and
  announced feedback retain their existing behaviour. Errors use both a border
  and text. Meaningful status text remains visible alongside status colours.
- Reduced-motion and forced-colour preferences are supported. Cards collapse
  into one column on phones; controls keep a minimum 46–48px height.

## Logo assets

`public/brand/firstpr-mark.svg` is the source mark: a branch joins a first commit,
inside a mustard square. It is original vector artwork, with no embedded fonts,
remote resources or raster dependency. The navigation uses this same SVG.

`public/favicon.ico` contains 16, 32 and 48px variants; `public/apple-touch-icon.png`
is 180px. Both derive from the SVG and are declared in root layout metadata.
When changing the mark, regenerate the raster versions from the source SVG too.

## Verification

Run `npm run check` and `FIRSTPR_E2E_PRODUCTION=1 npm run test:e2e`.
The complete workflow and full-page accessibility scans remain in place.
The browser report now also attaches representative desktop and mobile screens
for reviewing the directory, onboarding/profile, help form, mentor response,
curator editor/review and participant dashboard. See `VALIDATION.md` for test
boundaries and the remaining real-provider and assistive-technology pilot checks.

## Shared Git workflow loader

Use `AppLoading` from `src/components/app-loading.tsx` for screen/content loading.
Its optional `label` names the actual work (for example `Loading your profile…`).
The component centres itself in the available content area and scales to phones.
The root route fallback provides a full-viewport main landmark; child fallbacks
use their existing account/directory layout. Dashboard loading uses AccountShell.

Four original SVG icons show code → push → pull request → merge. A decorative
commit marker passes along the connectors on a 4.8-second CSS loop. This is an
indeterminate illustration, not measured progress or a real Git operation. Only
the stable status message is announced; the artwork is hidden from assistive
technology. Reduced motion shows the static chain without a moving marker.

`DirectoryLoading` delegates to the same component, including the directory's
inline Suspense fallback. Form submission labels such as “Saving…” stay local
to their controls so a pending mutation does not replace the page or steal focus.
