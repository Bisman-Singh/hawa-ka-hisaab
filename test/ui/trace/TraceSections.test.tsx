// Tests for the sheet's parts: the model trace with facts, raw reply as text and calls; the rules trace with the
// reason; a refused reply told by its check with no text; a failed number check with the numbers that matched nothing.
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

  it('says the facts made for the model were not sent when the model was never asked', () => {
    const facts = hindiPlanResponse('family-car-asthma', 'very_poor').trace.factsSent;
    render(<TraceSections trace={{ ...rulesTrace('disabled'), factsSent: facts }} />);
    expect(
      screen.getByRole('heading', { name: 'Facts made for the model, not sent because it was not asked' }),
    ).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Facts sent to the model' })).toBeInTheDocument();
    expect(screen.getByText('There is no model reply for this answer.')).toBeInTheDocument();
  });

  it('shows a refused reply as a refusal by its check, with the numbers that matched nothing, and never its text', () => {
    const refused: Trace = {
      ...rulesTrace('number_check_failed'),
      modelId: 'gemini-test',
      refusedBy: 'numbers',
      numberCheck: { status: 'failed', attempts: 1, unmatched: ['999'] },
    };
    const { container, rerender } = render(<TraceSections trace={refused} />);
    expect(screen.getByRole('heading', { name: 'A reply the checks refused' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: "The model's reply" })).toBeNull();
    expect(
      screen.getByText(
        'The model did reply, but its reply was not used because it used numbers the app did not supply.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Numbers that matched nothing: 999')).toHaveLength(2);
    expect(screen.queryByText(/used a number that is not in the facts/)).toBeNull();
    expect(screen.queryByText('There is no model reply for this answer.')).toBeNull();
    expect(container.querySelector('pre.raw')).toBeNull();
    expect(container.querySelector('details')).toBeNull();
    rerender(
      <TraceSections trace={{ ...refused, fallbackReason: 'invalid_reply', refusedBy: 'medicine' }} />,
    );
    expect(screen.getByText(/because it gave advice on medicines\.$/)).toBeInTheDocument();
    expect(screen.queryByText(/shape the app does not accept/)).toBeNull();
    expect(screen.getAllByText(/Numbers that matched nothing/)).toHaveLength(1);
  });

  it('never shows reply text on a trace the rules produced, even if one is carried', () => {
    const carried: Trace = { ...rulesTrace('invalid_reply'), modelReply: '{"text":"The AQI is 999."}' };
    const { container } = render(<TraceSections trace={carried} />);
    expect(container.querySelector('pre.raw')).toBeNull();
    expect(container).not.toHaveTextContent('999');
    expect(screen.getByText('The model replied in a shape the app does not accept.')).toBeInTheDocument();
  });

  it('says when a reply was reused from a few minutes ago, and nothing of the sort for a fresh one', () => {
    const { rerender } = render(
      <TraceSections trace={{ ...rulesTrace(null), producedBy: 'model', cached: true }} />,
    );
    expect(screen.getByText(/^Reused from a few minutes ago\./)).toBeInTheDocument();
    rerender(<TraceSections trace={{ ...rulesTrace(null), producedBy: 'model', cached: false }} />);
    expect(screen.queryByText(/Reused from a few minutes ago/)).toBeNull();
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
