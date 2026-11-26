// Tests for the browser entry.
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../src/config/app.js';

describe('main', () => {
  it('mounts the app into the root element on load, and refuses a missing element', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.append(root);
    const { mount } = await import('../../src/ui/main.js');
    expect(await screen.findByRole('heading', { level: 1, name: APP_NAME })).toBeInTheDocument();
    expect(() => {
      mount('missing');
    }).toThrow('No element with id missing');
  });
});
