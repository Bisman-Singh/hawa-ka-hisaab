// Tests for the browser entry.
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('main', () => {
  it('mounts the app into the root element on load, and refuses a missing element', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.append(root);
    const { mount } = await import('../../src/ui/main.js');
    expect(await screen.findByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
    expect(() => {
      mount('missing');
    }).toThrow('No element with id missing');
  });
});
