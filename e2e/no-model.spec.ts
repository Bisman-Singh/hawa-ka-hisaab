// Journeys without the model: the model over its quota, where the form is filled by hand and the rules plan is
// served and labelled; and the model kept off for this browser, where the plan is made here and nothing is sent.
import { expect, test } from '@playwright/test';
import { PIN, serveApi } from './support/api.js';
import { scriptedModel } from './support/model.js';
import { expectClean, watch } from './support/page.js';

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
  expect(model.tasks).toEqual(['intake', 'plan']);
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
  expect(model.tasks).toEqual([]);
  expect(api.calls.filter((call) => call.startsWith('POST'))).toEqual([]);
});
