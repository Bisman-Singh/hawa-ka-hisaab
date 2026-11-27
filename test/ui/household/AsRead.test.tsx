// Tests for what the model made of the typed text: the read lede and notes, or the reason it could not read.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IntakeResponse } from '../../../src/features/household/types.js';
import { AsRead } from '../../../src/ui/household/AsRead.js';
import { HOUSEHOLD, MODEL_DOWN } from '../../../src/ui/household/strings.js';
import { sampleHousehold, sampleTrace } from '../../support/samples.js';

describe('AsRead', () => {
  it('shows the text with what was not placed and assumed, or why the model did not read it', () => {
    const parsed: IntakeResponse = {
      outcome: 'parsed',
      household: sampleHousehold(),
      unplaced: ['a dog'],
      assumed: [],
      trace: sampleTrace(),
    };
    const { rerender } = render(
      <AsRead entry={{ text: 'Two adults and a dog.', response: parsed, used: false }} />,
    );
    expect(screen.getByText(HOUSEHOLD.readLede)).toBeInTheDocument();
    expect(screen.getByText('a dog')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: HOUSEHOLD.assumed })).toBeNull();
    const down: IntakeResponse = { outcome: 'unavailable', reason: 'timeout', trace: sampleTrace() };
    rerender(<AsRead entry={{ text: 'Two adults.', response: down, used: false }} />);
    expect(screen.getByText(new RegExp(MODEL_DOWN.timeout))).toBeInTheDocument();
    expect(screen.getByText('Two adults.')).toBeInTheDocument();
  });
});
