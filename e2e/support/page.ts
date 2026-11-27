// Checks every journey runs at each step: axe on the whole page, and no console error, page error or policy
// violation under the page's real policy, which the page records itself. Also a keyboard helper.
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/** What went wrong on a page so far: console errors, page errors and policy violations, as lines. */
export interface Watch {
  readonly problems: string[];
}

/** Starts collecting problems for a page. Call it before the first visit. */
export async function watch(page: Page): Promise<Watch> {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    problems.push(`page error: ${error.message}`);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      const seen = sessionStorage.getItem('policy-violations') ?? '';
      sessionStorage.setItem('policy-violations', `${seen}${event.effectiveDirective} ${event.blockedURI}\n`);
    });
  });
  return { problems };
}

/** Axe on the whole page against WCAG 2.2 AA, and no problem collected so far. */
export async function expectClean(page: Page, watched: Watch): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const found = results.violations.map(
    (item) => `${item.id}: ${item.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
  expect(found).toEqual([]);
  expect(watched.problems).toEqual([]);
  expect(await page.evaluate(() => sessionStorage.getItem('policy-violations'))).toBeNull();
}

/** Presses Tab, or Shift+Tab to go back, until the control has focus, failing after 120 presses. */
export async function tabTo(page: Page, control: Locator, key: 'Tab' | 'Shift+Tab' = 'Tab'): Promise<void> {
  const limit = 120;
  for (let press = 0; press < limit; press += 1) {
    if (await control.evaluate((element) => element === document.activeElement)) {
      return;
    }
    await page.keyboard.press(key);
  }
  throw new Error(`no focus on the control after ${String(limit)} tabs`);
}
