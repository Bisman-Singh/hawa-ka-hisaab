// Tests for the forecast strip: hours of the plan's day from the curve the server planned with, the stepper by
// keyboard, the hidden table, the airing window, the planning time, the Open-Meteo credit and why there is no strip.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ForecastStrip, stripHours, stripNote } from '../../../src/ui/plan/ForecastStrip.js';
import { STRIP } from '../../../src/ui/plan/words.js';
import { hourCurve } from '../../support/fake-air.js';
import { winterDay } from '../../support/plan-fixtures.js';
import { axeViolations } from '../helpers.js';
import { FORECAST, need, planResponse } from './fixtures.js';

const response = planResponse('family-car-asthma', 'poor', { notBefore: '06:40' });
const whatIf = need(response.whatIfContext);

describe('stripHours and stripNote', () => {
  it('reads hours 05 to 23 of the plan date and says why a strip is missing', () => {
    const hours = stripHours(FORECAST, '2026-11-24');
    expect(hours.map((hour) => hour.hour)).toEqual(Array.from({ length: 19 }, (_, index) => index + 5));
    expect(hours[0]).toEqual({ hour: 5, pm25: winterDay()[5] });
    expect(stripHours(FORECAST, '2026-12-30')).toEqual([]);
    const basis = response.airBasis;
    expect(stripNote({ ...basis, forecastIssuedAt: null }, null)).toBe(STRIP.noForecast);
    expect(stripNote(basis, null)).toBe(STRIP.notSent);
    expect(stripNote(basis, FORECAST)).toBe(STRIP.noForecast);
  });
});

describe('ForecastStrip', () => {
  it('draws the curve the server planned with, marks when it planned, and starts on the cleanest hour', async () => {
    const { container } = render(
      <ForecastStrip plan={response.plan} basis={response.airBasis} whatIf={whatIf} />,
    );
    const output = container.querySelector('output');
    expect(output).toHaveTextContent('14:00, PM2.5 110 µg/m³, model forecast');
    await userEvent.click(screen.getByRole('button', { name: 'Earlier hour' }));
    expect(output).toHaveTextContent('13:00, PM2.5 130');
    await userEvent.click(screen.getByRole('button', { name: 'Later hour' }));
    await userEvent.click(screen.getByRole('button', { name: 'Later hour' }));
    expect(output).toHaveTextContent('15:00, PM2.5 120');
    expect(container.querySelector('.ds-now')).toHaveTextContent('planned at 06:40');
    expect(container.querySelector('.ds-win')).toHaveTextContent('airing window 14:00 to 15:00');
    expect(container.querySelectorAll('div.vh > table tbody tr')).toHaveLength(19);
    expect(container.querySelectorAll('.ds-slots span')).toHaveLength(3);
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('puts the Open-Meteo credit and its licence as links next to the forecast', () => {
    render(<ForecastStrip plan={response.plan} basis={response.airBasis} whatIf={whatIf} />);
    expect(screen.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toHaveAttribute(
      'href',
      expect.stringContaining('open-meteo.com'),
    );
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
  });

  it('stops at the first and last hour, and leaves out the airing window and planning time when they do not apply', async () => {
    const plan = { ...response.plan, indoor: [], date: '2026-11-24' };
    const short = hourCurve([300, 200], '2026-11-24T05:00:00+05:30');
    const early = { curve: short, notBefore: '03:10' };
    const { container, rerender } = render(
      <ForecastStrip plan={plan} basis={response.airBasis} whatIf={early} />,
    );
    expect(screen.getByRole('button', { name: 'Later hour' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Earlier hour' }));
    expect(screen.getByRole('button', { name: 'Earlier hour' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Earlier hour' })).toHaveFocus();
    const reading = container.querySelector('output')?.textContent;
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Earlier hour' })).toHaveFocus();
    expect(container.querySelector('output')?.textContent).toBe(reading);
    await userEvent.click(screen.getByRole('button', { name: 'Later hour' }));
    await userEvent.click(screen.getByRole('button', { name: 'Later hour' }));
    expect(screen.getByRole('button', { name: 'Later hour' })).toHaveFocus();
    expect(container.querySelector('.ds-win')).toBeNull();
    expect(container.querySelector('.ds-now')).toBeNull();
    expect(container.querySelectorAll('.ds-slots span')).toHaveLength(1);
    rerender(
      <ForecastStrip plan={plan} basis={response.airBasis} whatIf={{ curve: short, notBefore: null }} />,
    );
    expect(container.querySelector('.ds-now')).toBeNull();
  });

  it('says why when there is no strip', () => {
    const { rerender } = render(
      <ForecastStrip
        plan={response.plan}
        basis={{ ...response.airBasis, forecastIssuedAt: null }}
        whatIf={{ curve: null, notBefore: null }}
      />,
    );
    expect(screen.getByText(STRIP.noForecast)).toBeInTheDocument();
    rerender(
      <ForecastStrip
        plan={response.plan}
        basis={response.airBasis}
        whatIf={{ curve: null, notBefore: null }}
      />,
    );
    expect(screen.getByText(STRIP.notSent)).toBeInTheDocument();
  });
});
