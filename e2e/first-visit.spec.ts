// What a first-time visitor meets: no paint before the stylesheet or the type, a title for every view, back and
// reload on every view, deep links that point to the step a view needs, and focus on each new view's heading.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PIN, serveApi } from './support/api.js';
import { scriptedModel } from './support/model.js';
import { expectClean, watch } from './support/page.js';

const VIEWS: readonly (readonly [string, string])[] = [
  ['', "Today's air for your place"],
  ['household', 'Your household'],
  ['plan', "Today's plan"],
  ['indoor', 'Indoor air and swaps'],
  ['compare', 'Two households, the same air'],
  ['community', 'Society or school'],
  ['privacy', 'Privacy'],
  ['about-data', 'About the data'],
];

const href = (view: string): string => (view === '' ? '/' : `/?view=${view}`);

/** When the first contentful paint happened. It waits for the entry, which a loaded machine records late. */
function firstPaint(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list, observer) => {
          const entry = list.getEntriesByName('first-contentful-paint')[0];
          if (entry !== undefined) {
            observer.disconnect();
            resolve(entry.startTime);
          }
        }).observe({ type: 'paint', buffered: true });
      }),
  );
}

test('nothing is painted before the stylesheet arrives, even when it is slow', async ({ page }) => {
  await page.route('**/assets/*.css', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  const paint = await firstPaint(page);
  const sheet = await page.evaluate(() => {
    const css = performance.getEntriesByType('resource').find((entry) => entry.name.endsWith('.css'));
    return css instanceof PerformanceResourceTiming ? css.responseEnd : -1;
  });
  const timing = { paint, sheet };
  expect(timing.sheet).toBeGreaterThan(0);
  expect(timing.paint).toBeGreaterThanOrEqual(timing.sheet);
});

test('on a slow connection the first paint already has the app type, so the text does not swap faces later', async ({
  page,
}) => {
  const network = await page.context().newCDPSession(page);
  await network.send('Network.enable');
  await network.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200_000,
    uploadThroughput: 100_000,
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const paint = await firstPaint(page);
  const ends = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.endsWith('.woff2'))
      .map((entry) => (entry instanceof PerformanceResourceTiming ? entry.responseEnd : Infinity)),
  );
  const timing = { paint, ends };
  expect(timing.ends).toHaveLength(2);
  for (const end of timing.ends) {
    expect(end).toBeLessThanOrEqual(timing.paint);
  }
});

test('every view has its own title and survives a reload, and the back button walks the views', async ({
  page,
}) => {
  await serveApi(page, scriptedModel('answers'));
  for (const [view, title] of VIEWS) {
    await page.goto(href(view));
    await expect(page).toHaveTitle(`${title}. Hawa Ka Hisaab`);
    await page.reload();
    await expect(page).toHaveTitle(`${title}. Hawa Ka Hisaab`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  }
  for (const [view, title] of [...VIEWS].reverse().slice(1)) {
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(view === '' ? '/$' : `view=${view}$`));
    await expect(page).toHaveTitle(`${title}. Hawa Ka Hisaab`);
  }
});

test('a deep link to a view that needs a place or a household points to that step', async ({ page }) => {
  const problems = await watch(page);
  await serveApi(page, scriptedModel('answers'));
  for (const view of ['plan', 'indoor', 'compare', 'community']) {
    await page.goto(href(view));
    await expect(page.getByRole('heading', { name: 'No place yet' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Set your place' })).toHaveAttribute('href', './');
    await expectClean(page, problems);
  }
  await page.getByRole('link', { name: 'Set your place' }).click();
  await expect(page.getByText('The official air reading for your place')).toBeFocused();
  await page.getByRole('textbox', { name: 'City, town or PIN code' }).fill(PIN);
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(page.getByRole('article', { name: /Station reading/ })).toBeVisible();
  await page.goto(href('plan'));
  await expect(page.getByRole('heading', { name: 'No household yet' })).toBeVisible();
  await page.getByRole('link', { name: 'Describe your household' }).click();
  await expect(page).toHaveURL(/\?view=household$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Your household' })).toBeFocused();
});

test('the footer leads to the privacy page, where the household can be cleared after a confirmation', async ({
  page,
}) => {
  const problems = await watch(page);
  await serveApi(page, scriptedModel('answers'));
  await page.goto('/');
  await page.getByRole('textbox', { name: 'City, town or PIN code' }).fill(PIN);
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeFocused();
  await expectClean(page, problems);
  await page.getByRole('button', { name: 'Clear my household' }).click();
  await page.getByRole('button', { name: 'Yes, clear them' }).click();
  await expect(page.getByText('Cleared from this browser', { exact: false }).first()).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.length)).toBe(0);
  await page.getByRole('contentinfo').getByRole('link', { name: 'About the data' }).click();
  await expect(page.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toBeVisible();
  await expectClean(page, problems);
});

test('the page policy is in force, and the check sees a violation when one happens', async ({ page }) => {
  const problems = await watch(page);
  await page.goto('/');
  await page.evaluate(() => {
    document.body.setAttribute('style', 'color: red');
  });
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('policy-violations')))
    .toContain('style-src');
  expect(problems.problems.join('\n')).toContain('style');
});
