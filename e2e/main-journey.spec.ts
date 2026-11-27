// The main journey on a phone: a PIN, the air card, a sample sentence read into the household, the plan for a
// severe day, its working, a what-if, how it was made, and two questions. Axe and the page policy at every step.
import { expect, test } from '@playwright/test';
import { formatEffect } from '../src/features/ledger/format.js';
import { SAMPLE_HOUSEHOLDS } from '../src/features/household/samples.js';
import { planResponseSchema } from '../src/features/planner/contract.js';
import { whatIfEffects } from '../src/features/planner/what-if.js';
import { contextFor, whatIfOf } from '../src/ui/plan/plan-data.js';
import { PIN, serveApi } from './support/api.js';
import type { ApiLog } from './support/api.js';
import { scriptedModel } from './support/model.js';
import { expectClean, tabTo, watch } from './support/page.js';

const family = SAMPLE_HOUSEHOLDS[0];

/** The CO2 sum the page should show for the carpool what-if, worked out from the plan the route served. */
function carpoolSum(api: ApiLog): string {
  const served = planResponseSchema.parse(
    api.answers.findLast((answer) => answer.path === '/api/plan')?.body,
  );
  const toggle = served.plan.slots.morning.flatMap((item) => item.whatIfs).find((w) => w.id === 'carpool-a1');
  if (family === undefined || toggle === undefined) {
    throw new Error('the plan has no carpool what-if');
  }
  const effects = whatIfEffects(contextFor(served.plan, family.household, whatIfOf(served)), toggle.patch);
  const co2 = effects.ok ? effects.value.find((effect) => effect.kind === 'co2') : undefined;
  if (co2 === undefined) {
    throw new Error('the carpool what-if has no CO2 effect');
  }
  return formatEffect(co2);
}

test('a family in Delhi plans a very poor day from a PIN and a sample sentence', async ({ page }) => {
  const problems = await watch(page);
  const model = scriptedModel('answers');
  const api = await serveApi(page, model);

  await test.step('first screen', async () => {
    await page.goto('/');
    await expect(page).toHaveTitle("Today's air for your place. Hawa Ka Hisaab");
    await expectClean(page, problems);
  });

  await test.step('place by PIN, then the air card', async () => {
    await page.getByRole('textbox', { name: 'City, town or PIN code' }).fill(PIN);
    await page.getByRole('button', { name: 'Find' }).click();
    const card = page.getByRole('article', { name: /Station reading/ });
    await expect(card).toContainText('JNU, Delhi - DPCC');
    await expect(card).toContainText('342');
    await expect(card).toContainText('Very Poor');
    await expect(page.getByText(`PIN ${PIN}, Central Delhi, Delhi`).first()).toBeVisible();
    await expectClean(page, problems);
  });

  await test.step('a sample sentence, read by the model into the household', async () => {
    await page.getByRole('button', { name: 'Use this' }).first().click();
    const box = page.getByRole('textbox', { name: 'Who is at home and how does your day go?' });
    await expect(box).toHaveValue(family?.description ?? '');
    await expect(box).toBeFocused();
    await page.getByRole('button', { name: 'Read it with the model' }).click();
    await expect(page).toHaveURL(/\?view=household$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Your household' })).toBeFocused();
    await expect(page.getByText('The model read your text into this form.')).toBeVisible();
    await expect(page).toHaveTitle('Your household. Hawa Ka Hisaab');
    await expectClean(page, problems);
  });

  await test.step('save, then the plan for a severe day', async () => {
    await page.getByRole('button', { name: 'Save household' }).click();
    await page.getByRole('button', { name: "Make today's plan" }).click();
    await expect(page).toHaveURL(/\?view=plan$/);
    const bulletin = page.getByRole('note');
    await expect(bulletin).toContainText('Very Poor air today');
    await expect(bulletin).toContainText('Remain indoors and keep activity levels low');
    await expect(page.getByText('Wording by Gemini').first()).toBeVisible();
    const aside = page.getByRole('complementary', { name: 'This account' });
    await expect(aside.getByRole('article', { name: /Station reading/ })).toContainText('342');
    await expectClean(page, problems);
  });

  await test.step('open a working, then change a what-if and see the figure change', async () => {
    const entry = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Office commute: take the bus' }) });
    await entry.getByText('Show the working').click();
    await expect(entry.getByRole('heading', { name: 'Formula' }).first()).toBeVisible();
    await expect(entry.getByRole('link').first()).toHaveAttribute('href', /^https:/);
    const sum = carpoolSum(api);
    await expect(entry.getByText(sum)).toHaveCount(0);
    await entry.getByRole('radio', { name: 'Share the ride with one more person' }).check();
    await expect(entry.getByText(sum).first()).toBeVisible();
    await expectClean(page, problems);
  });

  await test.step('how this was made', async () => {
    const opener = page.locator('.plan-head').getByRole('button', { name: 'How this was made' });
    await opener.click();
    const sheet = page.getByRole('dialog', { name: 'How this was made' });
    await expect(sheet.getByRole('heading', { name: 'Facts sent to the model' })).toBeVisible();
    await expect(
      sheet.getByText('Passed. Every number in the reply matched a fact or a calculator result.'),
    ).toBeVisible();
    await expectClean(page, problems);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(opener).toBeFocused();
  });

  await test.step('a question, answered with a calculator call', async () => {
    await page
      .getByRole('textbox', { name: 'Your question' })
      .fill('Can my son still go to school by car this morning?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    const answer = page.getByRole('article', { name: 'You asked' });
    await expect(answer).toContainText('The plan suggests this for that outing');
    await expect(answer.getByText('activity_options').first()).toBeAttached();
    await expectClean(page, problems);
  });

  await test.step('a medical question, answered by the fixed reply without the model', async () => {
    const asked = model.tasks.length;
    await page
      .getByRole('textbox', { name: 'Your question' })
      .fill('He is wheezing, which inhaler dose should he take?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    const answer = page.getByRole('article', { name: 'You asked' });
    await expect(answer).toContainText('Fixed reply, written in advance');
    await expect(answer).toContainText('This question was not sent to the model.');
    expect(model.tasks.length).toBe(asked);
    await expectClean(page, problems);
  });

  expect(model.tasks).toEqual(['intake', 'plan', 'ask']);
  expect(api.calls).toContain('POST /api/plan');
});

test('the same journey works with the keyboard alone', async ({ page }) => {
  const problems = await watch(page);
  await serveApi(page, scriptedModel('answers'));
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();

  await tabTo(page, page.getByRole('textbox', { name: 'City, town or PIN code' }));
  await page.keyboard.type(PIN);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('article', { name: /Station reading/ })).toContainText('342');

  await tabTo(page, page.getByRole('button', { name: 'Use this' }).first());
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: 'Read it with the model' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Your household' })).toBeFocused();

  await tabTo(page, page.getByRole('button', { name: 'Save household' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: "Make today's plan" })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: "Today's plan" })).toBeFocused();

  const entry = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Office commute: take the bus' }) });
  await tabTo(page, entry.getByRole('radio', { name: 'As planned' }));
  await page.keyboard.press('ArrowRight');
  await expect(entry.getByRole('radio', { name: 'As planned' })).not.toBeChecked();

  const opener = page.locator('.plan-head').getByRole('button', { name: 'How this was made' });
  await tabTo(page, opener, 'Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'How this was made' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();

  await tabTo(page, page.getByRole('textbox', { name: 'Your question' }));
  await page.keyboard.type('Can my son still go to school by car this morning?');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('article', { name: 'You asked' })).toContainText('The plan suggests this');
  await expectClean(page, problems);
});
