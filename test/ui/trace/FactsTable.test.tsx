// Tests for the facts table in the sheet: a clock time sent as an hour and a minute reads as one time, a number
// from a name has no unit word, other facts keep their units, and no facts gives a plain line.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { airFacts } from '../../../src/features/air/reading-facts.js';
import type { FactValue } from '../../../src/lib/types.js';
import { FactsTable, factRows } from '../../../src/ui/trace/FactsTable.js';
import { rulesTrace, stationReading } from '../plan/fixtures.js';

const fact = (id: string, label: string, [value, unit]: readonly [number, string]): FactValue => ({
  id,
  label,
  value,
  unit,
});

describe('factRows', () => {
  it('joins the parts of one clock time into one row and drops the unit word of a name', () => {
    const rows = factRows([
      fact('air-reading-time', 'Hour of the reading, hour', [5, 'hour']),
      fact('air-reading-time', 'Hour of the reading, minute', [0, 'minute']),
      fact('air-station-name', 'Number in the station name', [12, 'name']),
      fact('air-aqi', 'CPCB AQI at the station', [342, 'AQI']),
      fact('lone', 'An hour alone', [7, 'hour']),
      fact('other', 'A minute of another fact', [30, 'minute']),
      fact('a1', 'Start time as entered', [18, 'clock time']),
      fact('a1', 'Start time as entered', [6, 'clock time']),
      fact('a1', 'Start time as entered', [30, 'clock time']),
      fact('a2', 'Start time as entered', [8, 'clock time']),
      fact('a2', 'Start time as entered', [8, 'clock time']),
    ]);
    expect(rows).toEqual([
      { label: 'Hour of the reading', value: '05:00', id: 'air-reading-time' },
      { label: 'Number in the station name', value: '12', id: 'air-station-name' },
      { label: 'CPCB AQI at the station', value: '342 AQI', id: 'air-aqi' },
      { label: 'An hour alone', value: '7 hour', id: 'lone' },
      { label: 'A minute of another fact', value: '30 minute', id: 'other' },
      { label: 'Start time as entered', value: '18:30', id: 'a1' },
      { label: 'Start time as entered', value: '8, 8 clock time', id: 'a2' },
    ]);
  });

  it('writes a count of one in the singular and other counts in the plural', () => {
    const rows = factRows([
      fact('p1', 'People at home', [1, 'people']),
      fact('p2', 'People at home', [3, 'people']),
    ]);
    expect(rows.map((row) => row.value)).toEqual(['1 person', '3 people']);
  });

  it('reads the real air facts without an hour or minute unit', () => {
    const rows = factRows(airFacts(stationReading('very_poor')).facts);
    expect(rows.map((row) => row.value)).not.toContainEqual(expect.stringMatching(/ (hour|minute)$/));
    expect(rows.find((row) => row.id === 'air-reading-time')?.value).toMatch(/^\d\d:\d\d$/);
  });
});

describe('FactsTable', () => {
  it('draws one row per fact row, or says no facts were sent', () => {
    const facts = airFacts(stationReading('very_poor')).facts;
    const { container, rerender } = render(<FactsTable trace={{ ...rulesTrace(null), factsSent: facts }} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(factRows(facts).length);
    expect(screen.getByRole('table', { name: 'Facts sent, with value, unit and id' })).toBeInTheDocument();
    rerender(<FactsTable trace={{ ...rulesTrace('disabled'), factsSent: facts }} />);
    expect(
      screen.getByRole('table', { name: 'Facts made for the model, with value, unit and id' }),
    ).toBeInTheDocument();
    rerender(<FactsTable trace={rulesTrace(null)} />);
    expect(screen.getByText(/No facts were sent/)).toBeInTheDocument();
  });
});
