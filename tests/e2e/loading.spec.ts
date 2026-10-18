import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const stub = 'http://localhost:54329';

async function animationFrame(page: Page, loader: Locator, time: number) {
  await loader.evaluate((element, time) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = time;
    }
  }, time);
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

test('shared Git handoff loader is centred, accessible, responsive and respects reduced motion', async ({ page, request }, info) => {
  await request.get(stub + '/directory-control?mode=hold');
  try {
    await page.goto('/opportunities?q=keyboard', { waitUntil: 'commit' });
    const loader = page.locator('[data-app-loading]');
    await expect(loader.getByRole('status')).toHaveText('Loading opportunities…');
    await expect(loader.locator('[data-git-stage]')).toHaveCount(4);
    await expect(loader.getByRole('status')).toHaveCount(1);
    // Icons/stage names are an illustration; the real loading message is the announcement.
    await expect(loader.getByText('Pull request', { exact: true })).toBeVisible();
    await expect(loader.getByRole('img')).toHaveCount(0);
    await expect(loader.getByRole('button')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const icon = (stage: string) => loader.locator(`[data-git-stage="${stage}"] > div`);
    await animationFrame(page, loader, 600);
    const activeColour = await icon('code').evaluate(element => getComputedStyle(element).backgroundColor);
    await info.attach('git-loader-code-desktop', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    for (const [stage, time] of [['push', 1800], ['pr', 3000], ['merge', 4200]] as const) {
      await animationFrame(page, loader, time);
      await expect.poll(() => icon(stage).evaluate(element => getComputedStyle(element).backgroundColor)).toBe(activeColour);
      expect(await icon('code').evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(activeColour);
      await info.attach(`git-loader-${stage}-desktop`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
    const commit = loader.locator('[data-git-stage="code"] span > span');
    await animationFrame(page, loader, 900);
    const start = await commit.boundingBox();
    await animationFrame(page, loader, 1140);
    const end = await commit.boundingBox();
    expect(start).not.toBeNull(); expect(end).not.toBeNull();
    expect(end!.x).toBeGreaterThan(start!.x);

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await animationFrame(page, loader, 3000);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const centre = await loader.evaluate(element => {
        const outer = element.getBoundingClientRect();
        const panel = element.firstElementChild!.getBoundingClientRect();
        return { x: Math.abs(outer.x + outer.width / 2 - panel.x - panel.width / 2), y: Math.abs(outer.y + outer.height / 2 - panel.y - panel.height / 2) };
      });
      expect(centre.x).toBeLessThan(2); expect(centre.y).toBeLessThan(2);
      await info.attach(`git-loader-${width}px`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    await info.attach('git-loader-axe.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    expect(result.violations).toEqual([]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => icon('code').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
    await expect(commit).toBeHidden();
    await expect(loader.getByRole('status')).toHaveText('Loading opportunities…');
    await info.attach('git-loader-reduced-motion', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  } finally {
    await request.get(stub + '/directory-control?mode=normal');
  }
  // The animation must not add a minimum wait or prevent the real content replacing it.
  await expect(page.locator('[data-app-loading]')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('1 opportunity matching your filters');
  await expect(page.locator('.opportunity-card')).toHaveCount(1);
});
