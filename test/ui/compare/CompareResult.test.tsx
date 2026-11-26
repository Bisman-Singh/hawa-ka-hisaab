// Tests for a comparison row: a differing row shows both sides and the reason; a same row says so.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompareRow, SameAir } from '../../../src/ui/compare/CompareResult.js';

describe('CompareRow', () => {
  it('shows both sides with the reason when the topic differs, and one line when it is the same', () => {
    const { container } = render(
      <ol>
        <CompareRow
          topic="travel"
          found={{ topic: 'travel', left: 'Take the bus', right: 'No travel change' }}
        />
        <CompareRow topic="moved" found={undefined} />
      </ol>,
    );
    expect(screen.getByText('Take the bus')).toBeInTheDocument();
    expect(screen.getByText('No travel change')).toBeInTheDocument();
    expect(screen.getByText(/Swaps follow how each household travels/)).toBeInTheDocument();
    expect(screen.getByText('The same for both households.')).toBeInTheDocument();
    expect(container.querySelector('.differs')).toHaveTextContent('Differs');
    expect(container.querySelector('.same')).toHaveTextContent('Same');
  });
});

describe('SameAir', () => {
  it('names the band and hour of the air both plans used, and says when the band is not known', () => {
    const { container, rerender } = render(
      <SameAir
        basis={{
          path: 'station',
          band: 'poor',
          readingHour: '2026-11-24T22:00:00+05:30',
          forecastIssuedAt: null,
        }}
      />,
    );
    expect(container).toHaveTextContent('Both plans were made on the same air: Poor, reading for 22:00 IST.');
    rerender(
      <SameAir basis={{ path: 'unavailable', band: null, readingHour: null, forecastIssuedAt: null }} />,
    );
    expect(container).toHaveTextContent('Both plans were made on the same air: band not known.');
  });
});
