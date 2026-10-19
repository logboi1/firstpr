import { test, expect } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  await request.get("http://localhost:54329/reset");
});
test("GitHub sign-in, onboarding, refresh, own profile editing, logout and stale mutation denial", async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByRole('link', {name:'Sign in', exact:true})).toBeVisible();
  for (const route of ["/dashboard", "/profile", "/onboarding"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in$/);
  }
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Display name", { exact: true }).fill("Ada");
  await page
    .getByLabel("Skills and interests", { exact: true })
    .fill("React, documentation, React");
  await page
    .getByLabel("Experience level", { exact: true })
    .selectOption("intermediate");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome, Ada." }),
  ).toBeVisible();
  await expect(
    page.getByText("React, documentation", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome, Ada." }),
  ).toBeVisible();
  for (const route of ['/', '/opportunities', '/progress']) {
    await page.goto(route);
    await expect(page.locator('header').getByRole('link', {name:'Dashboard', exact:true})).toBeVisible();
    await expect(page.getByRole('link', {name:'Sign in', exact:true})).toHaveCount(0);
  }
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Display name", { exact: true }).fill("Ada Updated");
  // Forged owner/role fields must not change the authenticated mutation target.
  await page
    .locator("form")
    .first()
    .evaluate((form) => {
      for (const [name, value] of [
        ["id", "another-user"],
        ["role", "curator"],
      ]) {
        const input = document.createElement("input");
        input.name = name;
        input.value = value;
        form.append(input);
      }
    });
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Ada Updated." }),
  ).toBeVisible();
  await page.goto("/profile");
  const other = await context.newPage();
  await other.goto("/dashboard");
  await other.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(other).toHaveURL(/\/sign-in$/);
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Unauthorized edit");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.locator(".form-error:visible")).toContainText(
    "session has expired",
  );
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto('/');
  await expect(page.getByRole('link', {name:'Sign in', exact:true})).toBeVisible();
});
test("expired cookie session is refreshed and persisted on the response", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  const cookies = await context.cookies();
  const cookie = cookies.find((c) => c.name.endsWith("-auth-token"))!;
  expect(cookie).toBeDefined();
  const session = JSON.parse(
    Buffer.from(cookie.value.slice(7), "base64url").toString(),
  );
  session.expires_at = Math.floor(Date.now() / 1000) - 3600;
  session.expires_in = 0;
  await context.addCookies([
    {
      ...cookie,
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
    },
  ]);
  await page.goto('/');
  await expect(page.getByRole('link', {name:'Dashboard', exact:true})).toBeVisible();
  await expect(page.getByRole('link', {name:'Sign in', exact:true})).toHaveCount(0);
  await page.getByRole('link', {name:'Dashboard', exact:true}).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  const stats = await (
    await request.get("http://localhost:54329/stats")
  ).json();
  expect(stats.refreshes).toBeGreaterThan(0);
  const refreshed = (await context.cookies()).find(
    (c) => c.name === cookie.name,
  )!;
  const refreshedSession = JSON.parse(
    Buffer.from(refreshed.value.slice(7), "base64url").toString(),
  );
  expect(refreshedSession.expires_at).toBeGreaterThan(
    Math.floor(Date.now() / 1000),
  );
});
