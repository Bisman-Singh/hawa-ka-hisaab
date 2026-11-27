// Where focus is after each action that used to drop it to the page, and that an error a form refuses with is
// heard: read in the control's own description when focus lands on it, and said in the live region.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PIN, serveApi } from './support/api.js';
import { atPlace, planWithModel, saveByHand } from './support/flow.js';
import { scriptedModel } from './support/model.js';

const title = (page: Page) => page.getByRole('heading', { level: 1, name: "Today's plan" });

test('choosing the model keeps focus on the plan heading while it loads and when it is ready', async ({
  page,
}) => {
  await atPlace(page);
  await saveByHand(page);
  await page.getByRole('button', { name: 'Use the model' }).click();
  await expect(title(page)).toBeFocused();
  await expect(page.getByText('Wording by Gemini').first()).toBeVisible();
  await expect(title(page)).toBeFocused();
});

test('switching the plan language keeps focus on the heading until the Hindi plan is ready', async ({
  page,
}) => {
  await planWithModel(page);
  await page.getByRole('radio', { name: 'हिन्दी' }).check();
  await expect(title(page)).toBeFocused();
  await expect(page.locator('[lang="hi"] > .slot').first()).toBeVisible();
  await expect(title(page)).toBeFocused();
});

test('the forecast stepper keeps focus on a button at either end of the day', async ({ page }) => {
  await planWithModel(page);
  const later = page.getByRole('button', { name: 'Later hour' });
  await later.focus();
  for (let press = 0; press < 22; press += 1) {
    await page.keyboard.press('Enter');
  }
  await expect(later).toBeFocused();
  await expect(later).toHaveAttribute('aria-disabled', 'true');
  const earlier = page.getByRole('button', { name: 'Earlier hour' });
  await earlier.focus();
  for (let press = 0; press < 22; press += 1) {
    await page.keyboard.press('Enter');
  }
  await expect(earlier).toBeFocused();
  await expect(earlier).toHaveAttribute('aria-disabled', 'true');
});

test('asking keeps focus on the Ask button while the answer is worked out and after it arrives', async ({
  page,
}) => {
  await planWithModel(page);
  await page.getByRole('textbox', { name: 'Your question' }).fill('Can my son go to school by car?');
  const ask = page.getByRole('button', { name: 'Ask', exact: true });
  await ask.click();
  await expect(ask).toBeFocused();
  await expect(page.getByRole('article', { name: 'You asked' })).toBeVisible();
  await expect(ask).toBeFocused();
});

test('an empty question is heard: the box takes focus with the error already in its description', async ({
  page,
}) => {
  await planWithModel(page);
  const box = page.getByRole('textbox', { name: 'Your question' });
  await page.evaluate(() => {
    const field = document.querySelector('textarea');
    field?.addEventListener('focus', () => {
      const ids = (field.getAttribute('aria-describedby') ?? '').split(' ');
      sessionStorage.setItem(
        'described-at-focus',
        ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' | '),
      );
    });
  });
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(box).toBeFocused();
  await expect(box).toHaveAttribute('aria-invalid', 'true');
  await expect(box).toHaveAccessibleDescription(/^Type a question first\./);
  expect(await page.evaluate(() => sessionStorage.getItem('described-at-focus'))).toMatch(
    /^Type a question first\./,
  );
});

test('a blank place typed with Enter is said in the live region', async ({ page }) => {
  await serveApi(page, scriptedModel('answers'));
  await page.goto('/');
  const field = page.getByRole('textbox', { name: 'City, town or PIN code' });
  const said = page.locator('.vh[role="status"]');
  await field.focus();
  await page.keyboard.press('Enter');
  await expect(said).toHaveText('Type a city, town or PIN code first.');
  await expect(field).toBeFocused();
});

test('the community form says its error and holds focus on the send button while it works', async ({
  page,
}) => {
  await planWithModel(page);
  await page.goto('/?view=community');
  await page.getByRole('button', { name: 'Work out the facts' }).click();
  const homes = page.getByRole('textbox', { name: 'Homes (needed)' });
  await expect(homes).toBeFocused();
  await expect(homes).toHaveAccessibleDescription(/^Enter the number of homes, from 1 to 10000\./);
  await homes.fill('120');
  const send = page.getByRole('button', { name: 'Work out the facts' });
  await send.click();
  await expect(send).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Facts for this housing society' })).toBeVisible();
  await expect(send).toBeFocused();
});

test('Compare keeps focus on its button while it works and when the result is shown', async ({ page }) => {
  await planWithModel(page);
  await page.getByRole('link', { name: 'Compare with another household' }).click();
  const compare = page.getByRole('button', { name: 'Compare', exact: true });
  await compare.click();
  await expect(compare).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Sample household' })).toBeVisible();
  await expect(compare).toBeFocused();
});

test('Try again after a failed air reading keeps focus in the air card slot', async ({ page }) => {
  await serveApi(page, scriptedModel('answers'));
  let failed = false;
  await page.route('**/api/air*', async (route) => {
    if (failed) {
      await route.fallback();
      return;
    }
    failed = true;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'internal', message: 'No.', issues: [] } }),
    });
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'City, town or PIN code' }).fill(PIN);
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('button', { name: 'Try again' }).click();
  const slot = page.getByRole('group', { name: "Today's air" });
  await expect(slot).toBeFocused();
  await expect(page.getByRole('article', { name: /Station reading/ })).toContainText('342');
  await expect(slot).toBeFocused();
});

test('the severe-day warning comes right after the heading that takes focus', async ({ page }) => {
  await planWithModel(page);
  const order = await page.evaluate(() => {
    const head = document.querySelector('h1');
    const note = document.querySelector('[role="note"]');
    return head !== null && note !== null && Boolean(head.compareDocumentPosition(note) & 4);
  });
  expect(order).toBe(true);
});
