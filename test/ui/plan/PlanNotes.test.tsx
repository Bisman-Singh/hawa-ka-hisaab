// Tests for the notes above the plan: no model note when the model wrote it or no reason is given.
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Bulletin, ModelNote } from '../../../src/ui/plan/PlanNotes.js';
import { renderInApp } from '../helpers.js';
import { airResponse, hindiPlanResponse, planResponse, rulesTrace } from './fixtures.js';

describe('notes', () => {
  it('shows no model note for a model plan or a rules plan without a reason', () => {
    const { container } = renderInApp(
      <ModelNote response={hindiPlanResponse('family-car-asthma', 'very_poor')} again={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    const plain = planResponse('family-car-asthma', 'poor', { trace: rulesTrace(null) });
    renderInApp(<ModelNote response={plain} again={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('quotes both advisory lines for a severe band', () => {
    const response = planResponse('family-car-asthma', 'severe');
    renderInApp(<Bulletin band="severe" basis={response.airBasis} air={airResponse('severe')} />);
    expect(screen.getByRole('heading', { name: 'Severe air today' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('“Avoid outdoor physical activities”');
  });
});
