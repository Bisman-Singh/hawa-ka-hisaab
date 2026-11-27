// Tests for the ledger parts: slot section, entry columns, moved state, leader rows and the double-ruled total.
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LeaderRows, LedgerEntry, LedgerSlot, TotalTable } from '../../../src/ui/components/Ledger.js';
import { axeViolations } from '../helpers.js';

describe('ledger parts', () => {
  it('lays out a slot of entries with time, title, sums and what comes below', async () => {
    const { container } = render(
      <LedgerSlot title="Morning" hours="05:00 to 12:00" air="Forecast 142 to 242">
        <LedgerEntry
          time="06:30"
          fixity="can move"
          title="Park walk"
          who="Grandmother, 30 minutes"
          moved="Moved to 14:00"
        >
          <p className="why">The forecast is at its highest from 05 to 08.</p>
        </LedgerEntry>
        <LedgerEntry
          time="07:15"
          fixity="fixed"
          title="School ride"
          sums={[
            { label: 'Ride dose', figure: '77% less', range: 'range 61 to 91%' },
            { label: 'Effect', none: 'No figure. No measured factor for Indian homes.' },
          ]}
          more={<p className="tradeoff">The auto adds 0.11 kg of CO₂ each way.</p>}
          lang="hi"
        />
      </LedgerSlot>,
    );
    const slot = screen.getByRole('region', { name: 'Morning' });
    expect(within(slot).getByText('Forecast 142 to 242')).toHaveClass('air');
    const [walk, ride] = within(slot).getAllByRole('listitem');
    expect(walk).toHaveClass('entry', 'moved');
    expect(walk).toHaveTextContent('Moved to 14:00');
    expect(walk?.querySelector('.sums')).toBeNull();
    expect(ride).not.toHaveClass('moved');
    expect(ride).toHaveAttribute('lang', 'hi');
    expect(within(ride ?? slot).getByRole('heading', { level: 3, name: 'School ride' })).toBeInTheDocument();
    expect(ride?.querySelector('.range')).toHaveTextContent('range 61 to 91%');
    expect(ride?.querySelector('.none')).toHaveTextContent('No figure.');
    expect(ride?.querySelector('.more')).toHaveTextContent('0.11 kg');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('draws a column of sums with a total, and a totals table with the total last', async () => {
    const { container } = render(
      <>
        <LeaderRows
          kind="calc"
          rows={[{ label: 'Room', figure: '12 m²' }]}
          total={{ label: 'CADR for this room', figure: '240 m³ per hour' }}
        />
        <TotalTable
          caption="The day's reckoning"
          rows={[{ label: 'Travel CO₂ on your usual day', value: '2.34 kg' }]}
          total={{ label: 'Difference', value: '1.85 kg less' }}
        >
          <p className="note">Doses are not added across people.</p>
        </TotalTable>
        <LedgerSlot title="Evening" hours="17:00 to 23:00">
          <LedgerEntry time="Night" fixity="bedroom" title="Mosquito coil" />
        </LedgerSlot>
      </>,
    );
    expect(container.querySelector('dl.calc > .total')).toHaveTextContent('240 m³ per hour');
    const table = screen.getByRole('table', { name: "The day's reckoning" });
    const rows = within(table).getAllByRole('row');
    expect(rows.at(-1)).toHaveClass('total');
    expect(rows.at(-1)).toHaveTextContent('Difference1.85 kg less');
    expect(screen.getByText('Doses are not added across people.')).toHaveClass('note');
    expect(container.querySelector('.slot-head .air')).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('leaves the note out when there is none', () => {
    const { container } = render(
      <TotalTable caption="Totals" rows={[]} total={{ label: 'All', value: '0 kg' }} />,
    );
    expect(container.querySelector('.note')).toBeNull();
  });
});
