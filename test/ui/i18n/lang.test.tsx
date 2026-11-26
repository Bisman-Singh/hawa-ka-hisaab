// Tests for the language helper: Hindi passages carry lang="hi" so the Hindi face and line height apply.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { langOf, Passage } from '../../../src/ui/i18n/lang.js';

describe('language helper', () => {
  it('marks a passage and any element with its language', () => {
    render(
      <>
        <Passage language="hi">
          <p>आज हवा बहुत ख़राब है।</p>
        </Passage>
        <p {...langOf('en')}>Today the air is Very Poor.</p>
      </>,
    );
    expect(screen.getByText('आज हवा बहुत ख़राब है।').parentElement).toHaveAttribute('lang', 'hi');
    expect(screen.getByText('Today the air is Very Poor.')).toHaveAttribute('lang', 'en');
  });
});
