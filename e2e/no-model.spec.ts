// Journeys without the model's words: over its quota, the form by hand and a rules plan in English then Hindi; kept
// off, plans made here in both languages with nothing sent; and a wording the number check refuses.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { HINDI_ADVICE_NOTE } from '../src/features/planner/words-lexicon.js';
import { PIN, serveApi } from './support/api.js';
import { scriptedModel, UNBACKED } from './support/model.js';
import { expectClean, watch } from './support/page.js';
import type { Watch } from './support/page.js';

/** Switches the plan to Hindi and checks it reads as Hindi: its slots, the reckoning and the advice note once. */
async function expectHindiPlan(page: Page, problems: Watch): Promise<void> {
  await page.getByRole('radio', { name: 'हिन्दी' }).check();
  await expect(page.getByRole('heading', { level: 2, name: 'सुबह' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'शाम' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'दिन का हिसाब' })).toBeVisible();
  await expect(page.getByText(HINDI_ADVICE_NOTE)).toHaveCount(1);
  await expect(page.getByText('Hindi wording needs the model', { exact: false })).toHaveCount(0);
  await expect(page.locator('[lang="hi"] > .slot').first()).toBeVisible();
  await expectClean(page, problems);
}

test('the model is over its quota: the form by hand, then a rules plan that says so', async ({ page }) => {
  const problems = await watch(page);
  const model = scriptedModel('over_quota');
  const api = await serveApi(page, model);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'City, town or PIN code' }).fill(PIN);
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(page.getByRole('article', { name: /Station reading/ })).toContainText('342');

  await test.step('the description cannot be read, so the hand form opens with the reason', async () => {
    await page
      .getByRole('textbox', { name: 'Who is at home and how does your day go?' })
      .fill('An older couple.');
    await page.getByRole('button', { name: 'Read it with the model' }).click();
    await expect(page).toHaveURL(/\?view=household$/);
    await expect(page.getByText('The model is not reading descriptions right now')).toBeVisible();
    await expect(
      page.getByText('The model has used its free quota for now.', { exact: false }),
    ).toBeVisible();
    await expectClean(page, problems);
  });

  await test.step('the form, filled by hand', async () => {
    await page.getByRole('combobox', { name: 'Age group' }).selectOption({ label: '60 and over' });
    await page.getByRole('checkbox', { name: 'Asthma or other lung condition' }).check();
    await page.getByRole('button', { name: 'Save household' }).click();
    await page.getByRole('button', { name: "Make today's plan" }).click();
  });

  await test.step('the rules plan, labelled as such', async () => {
    await expect(page).toHaveURL(/\?view=plan$/);
    await expect(page.getByRole('heading', { name: 'The model is not answering right now' })).toBeVisible();
    await expect(
      page.getByText('The model has used up its free quota for now.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByText('Wording by fixed rules').first()).toBeVisible();
    await expect(page.getByRole('note')).toContainText('Very Poor air today');
    await expectClean(page, problems);
  });

  await test.step('the rules plan in Hindi, with the model still over its quota', async () => {
    await expectHindiPlan(page, problems);
    await expect(page.getByText('Wording by fixed rules').first()).toBeVisible();
  });
  expect(model.tasks).toEqual(['intake', 'plan', 'plan']);
  expect(api.calls).toContain('POST /api/plan');
});

test('the model kept off for this browser: the plan is made here and nothing goes to the model', async ({
  page,
}) => {
  const problems = await watch(page);
  const model = scriptedModel('answers');
  const api = await serveApi(page, model);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'City, town or PIN code' }).fill(PIN);
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(page.getByRole('article', { name: /Station reading/ })).toContainText('342');
  await page.getByRole('link', { name: 'Fill the form by hand' }).click();
  await page.getByRole('button', { name: 'Use this sample' }).first().click();
  await page.getByRole('button', { name: 'Save household' }).click();
  await page.getByRole('button', { name: "Make today's plan" }).click();

  await test.step('the choice comes before anything is sent', async () => {
    await expect(page.getByRole('heading', { name: "Before anything goes to Google's model" })).toBeVisible();
    await expect(
      page.getByText('Google may use what is sent to improve its products', { exact: false }),
    ).toBeVisible();
    await expectClean(page, problems);
    await page.getByRole('button', { name: 'Keep the model off' }).click();
  });

  await test.step('the plan made in this browser, labelled, with questions pointing to the switch', async () => {
    await expect(page.getByText('Made in this browser with fixed wording', { exact: false })).toBeVisible();
    await expect(page.getByRole('note')).toContainText('Very Poor air today');
    await expect(
      page.getByText('Questions are answered with the model, which is off for this browser.', {
        exact: false,
      }),
    ).toBeVisible();
    await expectClean(page, problems);
  });

  await test.step('the plan made here in Hindi, still with nothing sent', async () => {
    await expectHindiPlan(page, problems);
    await expect(page.getByText('क्यों।').first()).toBeVisible();
    await expect(page.getByText('पूरा हिसाब देखें, यह अंग्रेजी में है').first()).toBeVisible();
  });
  expect(model.tasks).toEqual([]);
  expect(api.calls.filter((call) => call.startsWith('POST'))).toEqual([]);
});

test('a wording the number check refuses: the rules plan, and the sheet names the check, never the text', async ({
  page,
}) => {
  const problems = await watch(page);
  const model = scriptedModel('misnumbers');
  await serveApi(page, model);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'City, town or PIN code' }).fill(PIN);
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(page.getByRole('article', { name: /Station reading/ })).toContainText('342');
  await page.getByRole('link', { name: 'Fill the form by hand' }).click();
  await page.getByRole('button', { name: 'Use this sample' }).first().click();
  await page.getByRole('button', { name: 'Save household' }).click();
  await page.getByRole('button', { name: "Make today's plan" }).click();
  await page.getByRole('button', { name: 'Use the model' }).click();

  await expect(
    page.getByRole('heading', { name: 'The model wording did not pass the checks' }),
  ).toBeVisible();
  await expect(page.getByText('Wording by fixed rules').first()).toBeVisible();
  await expect(page.getByText(`${UNBACKED} times worse`, { exact: false })).toHaveCount(0);
  await page.locator('.plan-head').getByRole('button', { name: 'How this was made' }).click();
  const sheet = page.getByRole('dialog', { name: 'How this was made' });
  await expect(sheet.getByRole('heading', { name: 'A reply the checks refused' })).toBeVisible();
  await expect(
    sheet.getByText('because it used numbers the app did not supply', { exact: false }),
  ).toBeVisible();
  await expect(sheet.getByText(`Numbers that matched nothing: ${UNBACKED}`).first()).toBeVisible();
  await expect(sheet.locator('pre.raw')).toHaveCount(0);
  await expect(sheet).not.toContainText('times worse outside');
  await expectClean(page, problems);
  expect(model.tasks.filter((task) => task === 'plan').length).toBeGreaterThan(0);
});
