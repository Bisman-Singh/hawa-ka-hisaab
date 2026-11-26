// Helpers for UI tests: axe on a rendered part, and the state and router a view expects around it.
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { RouterProvider } from '../../src/ui/router.js';
import { AppStateProvider } from '../../src/ui/state/app-state.js';

/** Ids of the axe violations in a rendered part of the page. Page-level rules need the whole page. */
export async function axeViolations(context: Element): Promise<string[]> {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const results = await axe.run(context, { resultTypes: ['violations'] });
  return results.violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(' ')}`,
  );
}

/** Renders inside the shared state, with the given storage, and the router. */
export function renderInApp(ui: ReactElement, storage: Storage | null = window.localStorage): RenderResult {
  return render(
    <AppStateProvider storage={storage}>
      <RouterProvider>{ui}</RouterProvider>
    </AppStateProvider>,
  );
}

function submitDialogForm(event: Event): void {
  const form = event.target;
  if (form instanceof HTMLFormElement && form.getAttribute('method') === 'dialog') {
    event.preventDefault();
    form.closest('dialog')?.close();
  }
}

/** Gives jsdom the modal dialog it lacks: showModal opens, close shuts and fires close, a dialog form closes. */
export function fakeDialog(): void {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (this.hasAttribute('open')) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      }
    },
  });
  document.removeEventListener('submit', submitDialogForm, true);
  document.addEventListener('submit', submitDialogForm, true);
}
