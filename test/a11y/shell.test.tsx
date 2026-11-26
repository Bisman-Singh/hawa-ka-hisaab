// Accessibility check of the shell with axe-core, on a document set up as index.html sets it up.
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { APP_NAME } from '../../src/config/app.js';
import { App } from '../../src/ui/App.js';

describe('shell accessibility', () => {
  it('has no axe violations', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    document.documentElement.lang = 'en';
    document.title = APP_NAME;
    render(<App />);
    const results = await axe.run(document, { resultTypes: ['violations'] });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
