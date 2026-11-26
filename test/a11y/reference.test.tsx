// Accessibility of the whole page with axe-core: the frame around the component reference, which shows every
// shared component in every state, checked with the light and then the dark scheme fixed on the page.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/App.js';
import { fakeDialog } from '../ui/helpers.js';
import { REFERENCE_VIEW } from '../ui/reference/ReferencePage.js';

afterEach(() => {
  delete document.documentElement.dataset['theme'];
});

describe('the page with every shared component', () => {
  it.each(['light', 'dark'])(
    'has no axe violations in the %s scheme, with the sheet shut and open',
    async (theme) => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
      fakeDialog();
      document.documentElement.lang = 'en';
      document.documentElement.dataset['theme'] = theme;
      document.title = 'Component reference';
      render(<App views={[REFERENCE_VIEW]} />);
      const run = async (): Promise<string[]> =>
        (await axe.run(document, { resultTypes: ['violations'] })).violations.map(
          (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(' ')}`,
        );
      expect(await run()).toEqual([]);
      await userEvent.click(screen.getByRole('button', { name: 'How this was made' }));
      expect(screen.getByRole('dialog', { name: 'How this was made' })).toBeInTheDocument();
      expect(await run()).toEqual([]);
    },
    30_000,
  );
});
