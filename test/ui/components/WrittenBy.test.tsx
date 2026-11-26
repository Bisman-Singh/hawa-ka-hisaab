// Tests for the written-by stamp: solid for the model, dashed for fixed rules and fixed replies.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WrittenBy } from '../../../src/ui/components/WrittenBy.js';

describe('WrittenBy', () => {
  it('names who wrote the words', () => {
    render(
      <>
        <WrittenBy producedBy="model" />
        <WrittenBy producedBy="rules" />
        <WrittenBy producedBy="fixed_reply" />
      </>,
    );
    expect(screen.getByText('Wording by Gemini')).toHaveClass('stamp');
    expect(screen.getByText('Wording by Gemini')).not.toHaveClass('rules');
    expect(screen.getByText('Wording by fixed rules')).toHaveClass('stamp', 'rules');
    expect(screen.getByText('Fixed reply, written in advance')).toHaveClass('stamp', 'rules');
  });
});
