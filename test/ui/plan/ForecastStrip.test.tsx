// Tests for the forecast strip: hours of the plan's day, the stepper by keyboard, the hidden table, the airing
// window and the time now, and why there is no strip.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ForecastStrip, stripHours, stripNotes } from '../../../src/ui/plan/ForecastStrip.js';
import { STRIP } from '../../../src/ui/plan/strings.js';
import { hourCurve } from '../../support/fake-air.js';
import { winterDay } from '../../support/plan-fixtures.js';
import { axeViolations } from '../helpers.js';
import { FORECAST, planResponse } from './fixtures.js';

const response = planResponse('family-car-asthma', 'poor');

describe('stripHours and stripNotes', () => {
  it('reads hours 05 to 23 of the plan date and says why a strip is missing', () => {
    const hours = stripHours(FORECAST, '2026-11-24');
    expect(hours.map((hour) => hour.hour)).toEqual(Array.from({ length: 19 }, (_, index) => index + 5));
    expect(hours[0]).toEqual({ hour: 5, pm25: winterDay()[5] });
    expect(stripHours(FORECAST, '2026-12-30')).toEqual([]);
    const basis = response.airBasis;
    expect(stripNotes({ ...basis, forecastIssuedAt: null }, null)).toEqual({
      why: STRIP.noForecast,
      other: false,
    });
    expect(stripNotes(basis, null)).toEqual({ why: STRIP.notLoaded, other: false });
    expect(stripNotes(basis, hourCurve(winterDay(), '2026-11-24T01:00:00+05:30')).other).toBe(true);
    expect(stripNotes(basis, FORECAST).other).toBe(false);
  });
});

describe('ForecastStrip', () => {
  it('starts on the cleanest hour and steps through the hours with the buttons', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-24T06:40:00+05:30'));
    const { container } = render(
      <ForecastStrip plan={response.plan} basis={response.airBasis} curve={FORECAST} />,
    );
    const output = container.querySelector('output');
    expect(output).toHaveTextContent('14:00, PM2.5 110 µg/m³, model forecast');
    await userEvent.click(screen.getByRole('button', { name: 'Earlier hour' }));
    expect(output).toHaveTextContent('13:00, PM2.5 130');
    await userEvent.click(screen.getByRole('button', { name: 'Later hour' }));
    await userEvent.click(screen.getByRole('button', { name: 'Later hour' }));
    expect(output).toHaveTextContent('15:00, PM2.5 120');
    expect(container.querySelector('.ds-now')).toHaveTextContent('now 06:40');
    expect(container.querySelector('.ds-win')).toHaveTextContent('airing window 14:00 to 15:00');
    expect(container.querySelectorAll('table.vh tbody tr')).toHaveLength(19);
    expect(container.querySelectorAll('.ds-slots span')).toHaveLength(3);
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('stops at the first and last hour, and leaves out the airing window and the time now when they do not apply', async () => {
    const plan = { ...response.plan, indoor: [], date: '2026-11-24' };
    const short = hourCurve([300, 200], '2026-11-24T05:00:00+05:30');
    const { container } = render(<ForecastStrip plan={plan} basis={response.airBasis} curve={short} />);
    expect(screen.getByRole('button', { name: 'Later hour' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Earlier hour' }));
    expect(screen.getByRole('button', { name: 'Earlier hour' })).toBeDisabled();
    expect(container.querySelector('.ds-win')).toBeNull();
    expect(container.querySelector('.ds-now')).toBeNull();
    expect(container.querySelectorAll('.ds-slots span')).toHaveLength(1);
    expect(screen.getByText(STRIP.otherCurve)).toBeInTheDocument();
  });

  it('says why when there is no strip', () => {
    render(
      <ForecastStrip
        plan={response.plan}
        basis={{ ...response.airBasis, forecastIssuedAt: null }}
        curve={null}
      />,
    );
    expect(screen.getByText(STRIP.noForecast)).toBeInTheDocument();
  });
});
