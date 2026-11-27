// Tests for the notes above the plan: no model note when the model wrote it or no reason is given, a refused
// wording named as refused by its check, and the severe-day bulletin.
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Trace } from '../../../src/lib/types.js';
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

  it('names a refused wording as refused by its check, and a model that did not answer as not answering', () => {
    const trace: Trace = { ...rulesTrace('number_check_failed'), refusedBy: 'numbers' };
    renderInApp(
      <ModelNote response={planResponse('family-car-asthma', 'poor', { trace })} again={vi.fn()} />,
    );
    expect(
      screen.getByRole('heading', { name: 'The model wording did not pass the checks' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/because it used numbers the app did not supply\.$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try the model again' })).toBeInTheDocument();
    renderInApp(
      <ModelNote
        response={planResponse('family-car-asthma', 'poor', { trace: rulesTrace('timeout') })}
        again={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'The model is not answering right now' })).toBeInTheDocument();
    expect(screen.getByText(/The model took too long to answer\.$/)).toBeInTheDocument();
  });

  it('quotes both advisory lines for a severe band', () => {
    const response = planResponse('family-car-asthma', 'severe');
    renderInApp(<Bulletin band="severe" basis={response.airBasis} air={airResponse('severe')} />);
    expect(screen.getByRole('heading', { name: 'Severe air today' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('“Avoid outdoor physical activities”');
  });
});
