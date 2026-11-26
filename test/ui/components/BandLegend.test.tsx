// Tests for the band legend: a closed disclosure around a real table with every band named in words.
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BandLegend } from '../../../src/ui/components/BandLegend.js';
import { axeViolations } from '../helpers.js';

describe('BandLegend', () => {
  it('opens to a captioned table of ranges and CPCB statements with the source', async () => {
    const { container } = render(<BandLegend />);
    const details = container.querySelector('details');
    expect(details).not.toHaveAttribute('open');
    await userEvent.click(screen.getByText('What the six bands mean'));
    expect(details).toHaveAttribute('open');
    const table = screen.getByRole('table', { name: 'CPCB AQI bands and health statements' });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(within(table).getByRole('rowheader', { name: 'Severe' })).toBeInTheDocument();
    expect(within(table).getByText('401 to 500')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the report' }).getAttribute('href')).toMatch(
      /^https:\/\/cpcb\.gov\.in\//,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
