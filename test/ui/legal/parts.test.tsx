// Tests for the labelled lines of the plain pages: each label sits beside its text.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Lines } from '../../../src/ui/legal/parts.js';

describe('Lines', () => {
  it('lists each label beside its text', () => {
    render(<Lines lines={[{ label: 'Here', text: 'Nothing.' }]} />);
    expect(screen.getByRole('listitem')).toHaveTextContent('HereNothing.');
  });
});
