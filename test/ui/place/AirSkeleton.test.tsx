// Tests for the waiting air card: a sentence for screen readers, hidden bars, and a busy region.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AirSkeleton } from '../../../src/ui/place/AirSkeleton.js';
import { axeViolations } from '../helpers.js';

describe('AirSkeleton', () => {
  it('says what is being read, hides the bars and marks the card busy', async () => {
    const { container } = render(<AirSkeleton where="Lucknow" />);
    expect(screen.getByRole('article', { name: 'Reading the air for Lucknow' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(container.querySelector('[aria-hidden="true"] .skel')).not.toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });
});
