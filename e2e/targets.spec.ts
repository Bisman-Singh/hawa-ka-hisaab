// Every control a thumb has to hit is at least 44 by 44 CSS pixels on a phone, on each main screen. A link inside a
// sentence is left out, since its size is set by the text around it.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { planWithModel } from './support/flow.js';

const MIN = 44;
const VIEWS = ['', 'household', 'plan', 'indoor', 'compare', 'community', 'privacy', 'about-data'];

interface Small {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

/** The controls on the page that are under the minimum, each with the size it has. */
function findSmall(min: number): Small[] {
  const hidden = (element: Element): boolean =>
    element.closest('.vh, .skip, [hidden], [aria-hidden="true"], dialog:not([open])') !== null;
  const inline = (element: Element): boolean =>
    element.tagName === 'A' &&
    getComputedStyle(element).display === 'inline' &&
    element.parentElement !== null &&
    !element.parentElement.matches('.sec, .actions, section, div') &&
    element.parentElement.textContent.trim().length > element.textContent.trim().length + 2;
  const targetOf = (element: Element): Element =>
    element instanceof HTMLInputElement && ['radio', 'checkbox'].includes(element.type)
      ? (element.closest('label') ?? element)
      : element;
  const selector = 'a[href], button, select, textarea, input:not([type="hidden"]), summary';
  const found: Small[] = [];
  for (const element of document.querySelectorAll(selector)) {
    const target = targetOf(element);
    const rect = target.getBoundingClientRect();
    const small = rect.width > 0 && (rect.width < min - 0.5 || rect.height < min - 0.5);
    if (small && !hidden(element) && !inline(target)) {
      const name = target.textContent.trim().slice(0, 40);
      found.push({ name: `${target.tagName.toLowerCase()} ${name}`, width: rect.width, height: rect.height });
    }
  }
  return found;
}

async function measure(page: Page, view: string): Promise<string[]> {
  await page.goto(view === '' ? '/' : `/?view=${view}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  const small = await page.evaluate(findSmall, MIN);
  return small.map(
    (item) => `${view || 'home'}: ${item.name} ${item.width.toFixed(0)}x${item.height.toFixed(0)}`,
  );
}

test('on a phone every control on the main screens is at least 44 by 44', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await planWithModel(page);
  const small: string[] = [];
  for (const view of VIEWS) {
    small.push(...(await measure(page, view)));
  }
  expect(small).toEqual([]);
});
