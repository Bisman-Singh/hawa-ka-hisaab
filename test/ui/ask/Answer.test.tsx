// Tests for the answer parts: Hindi answers carry lang="hi" with English sources, a model answer lists the sources
// of the facts it cites, and a refused answer names the check that refused it.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findFact } from '../../../src/config/facts/index.js';
import type { AskResponse } from '../../../src/features/assistant/types.js';
import { FixedReply, ModelAnswer } from '../../../src/ui/ask/Answer.js';
import { askAnswer, askMedical, askRules, need, rulesTrace } from '../plan/fixtures.js';

describe('answers', () => {
  it('marks a Hindi answer and a Hindi fixed reply with lang="hi", and keeps their sources English', () => {
    const answer: AskResponse = { ...askAnswer(), language: 'hi', text: 'शाम 3 बजे हवा साफ़ है।' };
    const { container } = render(<ModelAnswer answer={answer} />);
    expect(screen.getByText('शाम 3 बजे हवा साफ़ है।').parentElement).toHaveAttribute('lang', 'hi');
    expect(container.querySelector('.path')).not.toBeNull();
    const fixed = render(<FixedReply answer={{ ...askMedical(), language: 'hi' }} />).container;
    expect(screen.getByText(/does not answer questions about symptoms/).closest('[lang]')).toHaveAttribute(
      'lang',
      'hi',
    );
    expect(fixed.querySelector('ul.cite')?.closest('[lang]')).toHaveAttribute('lang', 'en');
    expect(fixed.querySelector('.stamp')?.closest('[lang]')).toBeNull();
  });

  it('lists the sources of the facts a model answer cites, each once, and nothing when it cites none', () => {
    const fact = need(findFact('advice-very-poor-vulnerable'));
    const cited: AskResponse = { ...askAnswer(), factIds: [fact.id, fact.id] };
    const { container, rerender } = render(<ModelAnswer answer={cited} />);
    expect(screen.getByText('Sources of the facts in this answer:')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: fact.source.title })).toHaveLength(1);
    rerender(<ModelAnswer answer={askAnswer()} />);
    expect(screen.queryByText('Sources of the facts in this answer:')).toBeNull();
    expect(container.querySelector('ul.cite')).toBeNull();
  });

  it('says which check refused the answer, and that the model did not answer only when it did not', () => {
    const refused: AskResponse = {
      ...askRules(),
      trace: { ...rulesTrace('invalid_reply'), refusedBy: 'treatment' },
    };
    const { rerender } = render(<ModelAnswer answer={refused} />);
    expect(
      screen.getByText(
        'The model did reply, but its reply was not used because it gave advice on treating symptoms or illness.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/The model did not answer/)).toBeNull();
    rerender(<ModelAnswer answer={askRules()} />);
    expect(
      screen.getByText(
        'The model did not answer, so this reply is fixed text. The model has used up its free quota for now.',
      ),
    ).toBeInTheDocument();
  });
});
