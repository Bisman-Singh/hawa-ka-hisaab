// Screen faults a style sheet can cause: a drawn sign in a name, a table without its headers, a page that pans
// sideways, and a focus ring drawn off screen. Each is read from the browser, on a phone and a laptop.
import { expect, test } from '@playwright/test';
import { planWithModel, samplePlan } from './support/flow.js';

test('a disclosure is named by its words, not by the plus or minus drawn beside them', async ({ page }) => {
  await samplePlan(page);
  const summary = page.getByText('Show the working').first();
  await expect(summary).toHaveAccessibleName('Show the working');
  await summary.click();
  await expect(page.locator('details[open] > summary').first()).toHaveAccessibleName('Show the working');
});

test('the band table keeps its column headers on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await planWithModel(page);
  await page.goto('/');
  await page.getByText('What the six bands mean').click();
  const table = page.getByRole('table').first();
  await expect(table.getByRole('columnheader').first()).toBeAttached();
  expect(await table.getByRole('columnheader').count()).toBeGreaterThan(1);
});

test('the plan does not pan sideways on a phone, even with wide text spacing', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await samplePlan(page);
  await page.evaluate(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(
      '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }',
    );
    document.adoptedStyleSheets = [sheet];
  });
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test('the sheet shows its focus ring inside its own edge', async ({ page }) => {
  await planWithModel(page);
  await page.locator('.plan-head').getByRole('button', { name: 'How this was made' }).click();
  const sheet = page.getByRole('dialog', { name: 'How this was made' });
  await sheet.evaluate((element) => {
    element.focus({ focusVisible: true });
  });
  const offset = await sheet.evaluate((element) => getComputedStyle(element).outlineOffset);
  expect(Number.parseFloat(offset)).toBeLessThan(0);
});
