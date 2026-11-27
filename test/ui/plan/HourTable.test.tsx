// Tests for the hour table: every hour and value is a row, and the table sits in a box that is hidden for sight.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HourTable } from '../../../src/ui/plan/HourTable.js';

const hours = [
  { hour: 5, pm25: 250 },
  { hour: 6, pm25: 120.5 },
];

describe('HourTable', () => {
  it('lists every hour in a table whose hidden box, not the table, is clipped', () => {
    const { container } = render(<HourTable hours={hours} />);
    expect([...container.querySelectorAll('td')].map((cell) => cell.textContent)).toEqual([
      '05:00',
      '250',
      '06:00',
      '120.5',
    ]);
    expect(screen.getByRole('table').closest('div')).toHaveClass('vh');
    expect(screen.getByRole('table')).not.toHaveClass('vh');
  });
});
