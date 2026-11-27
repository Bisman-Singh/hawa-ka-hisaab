// Tests for the parts of the plain pages: a section named by its heading and labelled lines.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Lines, Part } from '../../../src/ui/legal/parts.js';

describe('Part and Lines', () => {
  it('name the section by its heading and list each label beside its text', () => {
    render(
      <Part title="Kept">
        <Lines lines={[{ label: 'Here', text: 'Nothing.' }]} />
      </Part>,
    );
    expect(screen.getByRole('region', { name: 'Kept' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('HereNothing.');
  });
});
