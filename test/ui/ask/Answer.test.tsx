// Tests for the answer parts: Hindi answers carry lang="hi", and an answer with no calls says so.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AskResponse } from '../../../src/features/assistant/types.js';
import { FixedReply, ModelAnswer } from '../../../src/ui/ask/Answer.js';
import { askAnswer, askMedical } from '../plan/fixtures.js';

describe('answers', () => {
  it('marks a Hindi answer and a Hindi fixed reply with lang="hi"', () => {
    const answer: AskResponse = { ...askAnswer(), language: 'hi', text: 'शाम 3 बजे हवा साफ़ है।' };
    const { container } = render(<ModelAnswer answer={answer} />);
    expect(screen.getByText('शाम 3 बजे हवा साफ़ है।').parentElement).toHaveAttribute('lang', 'hi');
    expect(container.querySelector('.path')).not.toBeNull();
    render(<FixedReply answer={{ ...askMedical(), language: 'hi' }} />);
    expect(document.querySelector('.fixed-reply')).toHaveAttribute('lang', 'hi');
  });
});
