// Steps the journeys share: a place by PIN, a household saved by hand, and a plan made with the model on.
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PIN, serveApi } from './api.js';
import { scriptedModel } from './model.js';

/** Opens the app and finds the place for the test PIN, with the air card shown. */
export async function atPlace(page: Page): Promise<void> {
  await serveApi(page, scriptedModel('answers'));
  await page.goto('/');
  await page.getByRole('textbox', { name: 'City, town or PIN code' }).fill(PIN);
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(page.getByRole('article', { name: /Station reading/ })).toContainText('342');
}

/** Fills the household by hand, saves it and goes to the plan, where the model choice is asked. */
export async function saveByHand(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Fill the form by hand' }).click();
  await page.getByRole('combobox', { name: 'Age group' }).selectOption({ label: '60 and over' });
  await page.getByRole('button', { name: 'Save household' }).click();
  await page.getByRole('button', { name: "Make today's plan" }).click();
}

/** A plan with the model on, shown with its wording. */
export async function planWithModel(page: Page): Promise<void> {
  await atPlace(page);
  await saveByHand(page);
  await page.getByRole('button', { name: 'Use the model' }).click();
  await expect(page.getByText('Wording by Gemini').first()).toBeVisible();
}

/** A plan for a sample household read by the model from its sentence, on a severe day. */
export async function samplePlan(page: Page): Promise<void> {
  await atPlace(page);
  await page.getByRole('button', { name: 'Use this' }).first().click();
  await page.getByRole('button', { name: 'Read it with the model' }).click();
  await page.getByRole('button', { name: 'Save household' }).click();
  await page.getByRole('button', { name: "Make today's plan" }).click();
  await expect(page.getByText('Wording by Gemini').first()).toBeVisible();
}
