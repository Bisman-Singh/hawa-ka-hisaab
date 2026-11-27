// Tests for the indoor parts: a step without a figure has no sum, and a note with a figure opens its working.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Note, PurifierStep } from '../../../src/ui/indoor/IndoorParts.js';
import { need, planResponse } from '../plan/fixtures.js';

const steps = () => planResponse('family-car-asthma', 'poor').plan.indoor;

describe('indoor parts', () => {
  it('shows a purifier step with no figure as advice only, and a note with a figure with its working', () => {
    const purifier = need(steps().find((step) => step.topic === 'purifier'));
    const { container } = render(<PurifierStep step={{ ...purifier, figure: null }} language="en" />);
    expect(container.querySelector('dl.calc')).toBeNull();
    expect(screen.getByText(purifier.detail)).toBeInTheDocument();
    const airing = need(steps().find((step) => step.topic === 'ventilation'));
    render(
      <ul>
        <Note step={airing} language="en" />
      </ul>,
    );
    expect(screen.getByText('Show the working')).toBeInTheDocument();
    expect(screen.queryByText('No measured figure for this step.')).toBeNull();
  });

  it('names a source id that has no record rather than hiding it', () => {
    const step = { ...need(steps()[0]), factIds: ['no-such-fact'] };
    render(
      <ul>
        <Note step={step} language="en" />
      </ul>,
    );
    expect(screen.getByText('no-such-fact, no source record on this page.')).toBeInTheDocument();
  });

  it('marks text the plan wrote in Hindi as Hindi and keeps its sources English', () => {
    const hindi = planResponse('family-car-asthma', 'poor', { language: 'hi' }).plan.indoor;
    const airing = need(hindi.find((step) => step.topic === 'ventilation'));
    const { container } = render(
      <ul>
        <Note step={airing} language="hi" />
      </ul>,
    );
    expect(screen.getByRole('heading', { name: airing.title })).toHaveAttribute('lang', 'hi');
    expect(screen.getByText(airing.detail)).toHaveAttribute('lang', 'hi');
    expect(container.querySelector('ul.cite')?.closest('[lang="hi"]')).toBeNull();
  });
});
