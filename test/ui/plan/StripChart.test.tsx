// Tests for the strip drawing: one bar per hour with its value as a custom property, odd hours hidden on the axis.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Chart, HourTable } from '../../../src/ui/plan/StripChart.js';
import { planResponse } from './fixtures.js';

const hours = [
  { hour: 5, pm25: 250 },
  { hour: 6, pm25: 120.5 },
];

describe('Chart', () => {
  it('draws one bar per hour with its value, hides odd hours on the axis and marks the selected one', () => {
    const { container } = render(
      <Chart
        hours={hours}
        selected={1}
        plan={planResponse('family-car-asthma', 'poor').plan}
        madeAt={null}
      />,
    );
    const bars = container.querySelectorAll<HTMLElement>('.ds-bars li');
    expect(bars).toHaveLength(2);
    expect(bars[0]?.style.getPropertyValue('--v')).toBe('250');
    expect(bars[1]).toHaveClass('sel');
    expect(container.querySelector('.ds-axis li')).toHaveClass('odd');
    expect(container.querySelector('.ds-chart')).toHaveAttribute('aria-hidden', 'true');
  });

  it('names the parts of the day in the language of the plan, marked with it', () => {
    const plan = planResponse('family-car-asthma', 'poor').plan;
    const { container, rerender } = render(<Chart hours={hours} selected={0} plan={plan} madeAt={null} />);
    expect(container.querySelector('.ds-slots')).toHaveTextContent('Morning');
    rerender(<Chart hours={hours} selected={0} plan={{ ...plan, language: 'hi' }} madeAt={null} />);
    expect(container.querySelector('.ds-slots')).toHaveTextContent('सुबह');
    expect(container.querySelector('.ds-slots')).toHaveAttribute('lang', 'hi');
  });

  it('lists every hour in the hidden table', () => {
    const { container } = render(<HourTable hours={hours} />);
    expect([...container.querySelectorAll('td')].map((cell) => cell.textContent)).toEqual([
      '05:00',
      '250',
      '06:00',
      '120.5',
    ]);
  });
});
