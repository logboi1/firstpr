import { test, expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const stub = 'http://localhost:54329';

async function scan(page: Page, info: TestInfo, name: string) {
  // Full-page WCAG A/AA scans; never exclude controls or disable failing rules.
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await info.attach(`${name}-axe.json`, { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect.soft(result.violations.map(({ id, nodes }) => ({ id, elements: nodes.map(node => node.html) })), name).toEqual([]);
  await expect(page.getByRole('main')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function login(page: Page, account: string) {
  await page.context().addCookies([{ name: 'firstpr-test-account', value: account, domain: 'localhost', path: '/' }]);
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Continue with GitHub', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}
async function onboard(page: Page, name: string) {
  await page.getByLabel('Display name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('public pages, keyboard skip link and recoverable failure remain accessible on mobile', async ({ page, request }, info) => {
  test.setTimeout(180000);
  await request.get(stub + '/reset');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, path] of [['home', '/'], ['sign-in', '/sign-in'], ['directory', '/opportunities'], ['board', '/progress'], ['404', '/missing-page']]) {
    await page.goto(path);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await scan(page, info, name);
  }
  await request.get(stub + '/directory-control?mode=error-once');
  await page.goto('/opportunities');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await scan(page, info, 'directory-error');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: /unavailable/i })).toHaveCount(0);
  await info.attach('public-mobile', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('one participant journey reaches mentor resolution, curator verification and an opt-in public board', async ({ page, browser, request }, info) => {
  test.setTimeout(240000);
  await request.get(stub + '/reset');
  await request.get(stub + '/curator-control?enabled=true');
  await request.get(stub + '/mentor-control?account=mentor&enabled=true');
  const { task } = await (await request.get(stub + '/progress-control?fixture=true')).json();
  await login(page, 'journey');
  await scan(page, info, 'onboarding');
  await page.getByLabel('Display name', { exact: true }).fill('   ');
  await page.getByLabel('Skills and interests', { exact: true }).fill('Documentation, testing');
  await page.getByLabel('Experience level', { exact: true }).selectOption('intermediate');
  await page.getByRole('checkbox', { name: /Show my display name/ }).check();
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Enter a display name.' })).toBeVisible();
  await expect(page.getByLabel('Skills and interests', { exact: true })).toHaveValue('Documentation, testing');
  await expect(page.getByLabel('Experience level', { exact: true })).toHaveValue('intermediate');
  await expect(page.getByRole('checkbox', { name: /Show my display name/ })).toBeChecked();
  await scan(page, info, 'profile-validation');
  await page.getByRole('checkbox', { name: /Show my display name/ }).uncheck();
  await onboard(page, 'JOURNEY participant');
  await page.goto('/profile'); await scan(page, info, 'profile');
  for (const path of ['/mentor/help', '/admin/contributions', '/admin/opportunities']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Let’s find your way back.', exact: true })).toBeVisible();
    await scan(page, info, `forbidden-${path.replaceAll('/', '-')}`);
  }
  await page.goto(`/opportunities/${task}`);
  await page.getByRole('button', { name: 'Start this task', exact: true }).click();
  const checkbox = page.getByRole('checkbox', { name: 'Read the progress fixture guide', exact: true });
  await checkbox.focus(); await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked(); await expect(checkbox).toBeFocused();
  await scan(page, info, 'task-checklist');
  await page.getByRole('link', { name: 'Request help', exact: true }).click();
  await scan(page, info, 'help-form');
  const blocker = 'JOURNEY private blocker: where should I add the regression test?';
  const textarea = page.getByLabel('What is blocking you?', { exact: true });
  await textarea.fill(blocker); await textarea.focus();
  expect(await textarea.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.getByRole('button', { name: 'Send help request', exact: true }).click();
  await expect(page).toHaveURL(/\/help\?sent=1$/);
  const card = page.locator('.help-request').filter({ hasText: blocker });
  const id = await card.locator('input[name="request_id"]').inputValue();
  const mentorContext = await browser.newContext(); const mentor = await mentorContext.newPage();
  const curatorContext = await browser.newContext(); const curator = await curatorContext.newPage();
  try {
    await login(mentor, 'mentor'); await onboard(mentor, 'JOURNEY mentor');
    await mentor.goto('/mentor/help'); await scan(mentor, info, 'mentor-queue');
    await mentor.goto(`/mentor/help/${id}`);
    await mentor.getByRole('button', { name: 'Claim request', exact: true }).click();
    await expect(mentor.getByLabel('Guidance for the participant', { exact: true })).toBeVisible();
    await scan(mentor, info, 'mentor-response');
    await mentor.getByLabel('Guidance for the participant', { exact: true }).fill('Add the regression test beside the existing checklist tests.');
    await mentor.getByRole('button', { name: 'Send guidance and resolve', exact: true }).click();
    await expect(mentor.locator('.help-status')).toContainText('resolved');
    await page.goto(`/help/${id}`);
    await expect(page.locator('.mentor-note')).toContainText('Add the regression test');
    await scan(page, info, 'resolved-help');
    await page.goto(`/contributions/new?opportunity=${task}`); await scan(page, info, 'submission-form');
    const url = 'https://github.com/firstpr-demo/journey/pull/1201';
    await page.getByLabel('GitHub pull-request URL', { exact: true }).fill(url);
    await page.getByRole('button', { name: 'Submit pull request', exact: true }).click();
    await expect(page).toHaveURL(/\/contributions\?sent=1$/);
    await login(curator, 'curator'); await onboard(curator, 'JOURNEY curator');
    await curator.goto('/admin/opportunities/new'); await scan(curator, info, 'curator-editor');
    await curator.goto('/admin/contributions');
    const review = curator.locator('.help-request').filter({ has: curator.locator(`a[href="${url}"]`) });
    await scan(curator, info, 'curator-review');
    await review.getByLabel('Manual verification decision', { exact: true }).selectOption('merged');
    await review.getByRole('checkbox').check();
    await review.getByRole('button', { name: 'Record manual decision', exact: true }).click();
    await expect(review.locator('.help-status')).toHaveText('merged');
    await page.goto('/dashboard');
    const taskCard = page.locator('.dashboard-task').filter({ hasText: 'PROGRESS-FIXTURE' });
    await expect(taskCard).toContainText('1 of 2 steps completed');
    await expect(taskCard).toContainText('0 active help requests');
    await expect(taskCard).toContainText('1 merged');
    await page.setViewportSize({ width: 390, height: 844 });
    await scan(page, info, 'participant-mobile-dashboard');
    await page.getByRole('button', { name: 'Join public progress', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Make my progress private', exact: true })).toBeVisible();
    // The public read uses an independent, signed-out context.
    const visitorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const visitor = await visitorContext.newPage();
    try {
      await visitor.goto('/progress');
      const entry = visitor.locator('.public-contribution').filter({ has: visitor.locator(`a[href="${url}"]`) });
      await expect(entry).toContainText('JOURNEY participant'); await expect(entry).toContainText('merged');
      expect(await visitor.content()).not.toContain(blocker);
      await scan(visitor, info, 'public-mobile-result');
      await info.attach('completed-mobile-journey', { body: await visitor.screenshot({ fullPage: true }), contentType: 'image/png' });
    } finally { await visitorContext.close(); }
    // Leave shared fixtures private for the remaining independent regression specs.
    await page.getByRole('button', { name: 'Make my progress private', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Join public progress', exact: true })).toBeVisible();
  } finally { await mentorContext.close(); await curatorContext.close(); }
});
