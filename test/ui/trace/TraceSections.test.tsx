// Tests for the sheet's parts: the model trace with facts, raw reply as text and calls; the rules trace with the
// reason; a failed number check with the numbers that matched nothing.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Trace } from '../../../src/lib/types.js';
import { TraceSections } from '../../../src/ui/trace/TraceSections.js';
import { askAnswer, hindiPlanResponse, rulesTrace } from '../plan/fixtures.js';

describe('TraceSections', () => {
  it('shows the facts sent, the raw reply as text and the number check of a model trace', () => {
    const trace = hindiPlanResponse('family-car-asthma', 'very_poor').trace;
    const { container } = render(<TraceSections trace={trace} />);
    expect(screen.getByText('Wording by Gemini')).toBeInTheDocument();
    expect(screen.getByText('gemini-test', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Passed\. Every number/)).toBeInTheDocument();
    expect(container.querySelectorAll('table.facts tbody tr')).toHaveLength(trace.factsSent.length);
    expect(container.querySelector('pre.raw')?.textContent).toBe(trace.modelReply);
    expect(screen.getByText('None.')).toBeInTheDocument();
  });

  it('lists each calculator call with its result or failure', () => {
    render(<TraceSections trace={askAnswer().trace} />);
    expect(screen.getAllByText('travel_co2')).not.toHaveLength(0);
    expect(screen.getByText('The arguments were refused.')).toBeInTheDocument();
  });

  it('says why fixed rules wrote the words and that nothing was sent', () => {
    render(<TraceSections trace={rulesTrace('timeout')} />);
    expect(screen.getByText('Wording by fixed rules')).toBeInTheDocument();
    expect(screen.getByText('The model took too long to answer.')).toBeInTheDocument();
    expect(screen.getByText(/No facts were sent/)).toBeInTheDocument();
    expect(screen.getByText('There is no model reply for this answer.')).toBeInTheDocument();
  });

  it('names the numbers that matched nothing when the check failed', () => {
    const trace: Trace = {
      ...rulesTrace('number_check_failed'),
      numberCheck: { status: 'failed', attempts: 2, unmatched: ['42', '7.5'] },
    };
    render(<TraceSections trace={trace} />);
    expect(screen.getByText('Numbers that matched nothing: 42, 7.5')).toBeInTheDocument();
    expect(screen.getByText('Failed, so the reply was not used.')).toBeInTheDocument();
  });
});
