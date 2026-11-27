// The society or school view with a sample society, the notice in English and Hindi and its copy; and compare,
// two households in the same air. Axe and the page policy at every step.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noticeResponseSchema } from '../src/features/community/contract.js';
import { noticeToPlainText } from '../src/features/community/notice.js';
import { PIN, serveApi } from './support/api.js';
import type { ApiLog } from './support/api.js';
import { scriptedModel } from './support/model.js';
import { expectClean, watch } from './support/page.js';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

async function setPlace(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'City, town or PIN code' }).fill(PIN);
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(page.getByRole('article', { name: /Station reading/ })).toContainText('342');
}

function servedNotice(api: ApiLog) {
  return noticeResponseSchema.parse(api.answers.findLast((answer) => answer.path === '/api/notice')?.body);
}

test('a housing society gets its facts, actions and a notice in English and Hindi to copy', async ({
  page,
}) => {
  const problems = await watch(page);
  const api = await serveApi(page, scriptedModel('answers'));
  await setPlace(page);
  await page.goto('/?view=community');
  await expect(page).toHaveTitle('Society or school. Hawa Ka Hisaab');
  await expectClean(page, problems);

  await page.getByRole('button', { name: /A housing society of 120 flats/ }).click();
  await page.getByRole('button', { name: 'Work out the facts' }).click();
  await page.getByRole('button', { name: 'Use the model' }).click();

  const english = page.getByRole('article', { name: 'Notice in English' });
  const hindi = page.getByRole('article', { name: 'हिन्दी में सूचना' });
  await expect(english).toBeVisible();
  await expect(hindi).toHaveAttribute('lang', 'hi');
  await expect(page.getByRole('heading', { name: 'Facts for this housing society' })).toBeVisible();
  await expectClean(page, problems);

  await page.getByRole('button', { name: 'Copy English' }).click();
  await expect(page.getByText('Copied the notice text.')).toBeAttached();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(noticeToPlainText(servedNotice(api).notice.en));
});

test('compare puts two households in the same air side by side', async ({ page }) => {
  const problems = await watch(page);
  await serveApi(page, scriptedModel('answers'));
  await setPlace(page);
  await page.getByRole('button', { name: 'Use this' }).first().click();
  await page.getByRole('button', { name: 'Read it with the model' }).click();
  await page.getByRole('button', { name: 'Save household' }).click();
  await page.goto('/?view=compare');
  await expect(page.getByRole('heading', { level: 1, name: 'Two households, the same air' })).toBeVisible();
  await page.getByLabel('Compare with').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample household' })).toBeVisible();
  await expect(page.locator('ol.cmp > li')).toHaveCount(6);
  await expectClean(page, problems);
});
