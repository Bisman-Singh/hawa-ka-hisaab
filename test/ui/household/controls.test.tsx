// Tests for the labelled select and text input: value in, change out, problem tied to the control.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Choice, TextInput } from '../../../src/ui/household/controls.js';
import { axeViolations } from '../helpers.js';

describe('Choice', () => {
  it('shows the named options and passes the chosen value on', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <Choice<'adult' | 'child'>
        id="age"
        error={undefined}
        label="Age group"
        value="adult"
        options={{ adult: '18 to 59', child: '1 to 12' }}
        onChange={onChange}
      />,
    );
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Age group' }), '1 to 12');
    expect(onChange).toHaveBeenCalledWith('child');
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('TextInput', () => {
  it('passes each change on, carries its hint, and ties a problem to the control', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TextInput
        id="km"
        error={undefined}
        label="Km"
        hint="One way."
        value=""
        onChange={onChange}
        inputMode="decimal"
      />,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Km' }), '4');
    expect(onChange).toHaveBeenCalledWith('4');
    expect(screen.getByRole('textbox', { name: 'Km' })).toHaveAttribute('inputmode', 'decimal');
    rerender(
      <TextInput
        id="at"
        error="Enter a time such as 07:30."
        label="Starts at"
        type="time"
        value=""
        onChange={onChange}
      />,
    );
    const time = screen.getByLabelText('Starts at');
    expect(time).toHaveAttribute('type', 'time');
    expect(time).toHaveAccessibleDescription('Enter a time such as 07:30.');
    expect(time).toHaveAttribute('aria-invalid', 'true');
  });
});
