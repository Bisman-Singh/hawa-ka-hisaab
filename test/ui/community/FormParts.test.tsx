// Tests for the form parts: a labelled input asks for the right keyboard and passes its text on.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LabelledInput } from '../../../src/ui/community/FormParts.js';

describe('LabelledInput', () => {
  it('uses a time input for times and a decimal keyboard for decimals, and passes the text on', async () => {
    const onText = vi.fn();
    render(
      <>
        <LabelledInput label="Starts at" value="" onText={onText} kind="time" />
        <LabelledInput label="Hours" value="" onText={onText} kind="decimal" error="Too many." />
      </>,
    );
    expect(screen.getByLabelText('Starts at')).toHaveAttribute('type', 'time');
    const hours = screen.getByLabelText('Hours');
    expect(hours).toHaveAttribute('inputmode', 'decimal');
    expect(hours).toHaveAttribute('aria-invalid', 'true');
    await userEvent.type(hours, '4');
    expect(onText).toHaveBeenCalledWith('4');
  });
});
