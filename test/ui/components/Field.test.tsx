// Tests for the field: label, hint and error are tied to the control, and the error marks it invalid.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from '../../../src/ui/components/Field.js';
import { axeViolations } from '../helpers.js';

describe('Field', () => {
  it('describes the control by its hint', async () => {
    const { container } = render(
      <Field label="City, town or PIN code" hint="Any place in India." id="place">
        {(control) => <input {...control} className="input" autoComplete="address-level2" />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'City, town or PIN code' });
    expect(input).toHaveAttribute('id', 'place');
    expect(input).toHaveAccessibleDescription('Any place in India.');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('reads the error first and marks the control invalid', async () => {
    const { container } = render(
      <Field
        label="City, town or PIN code"
        hint="Any place in India."
        error="No place in India matches Lukhnow."
      >
        {(control) => <input {...control} className="input" />}
      </Field>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('No place in India matches Lukhnow. Any place in India.');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('works with a text area and no hint', () => {
    render(<Field label="Your question">{(control) => <textarea {...control} rows={3} />}</Field>);
    const box = screen.getByRole('textbox', { name: 'Your question' });
    expect(box).not.toHaveAttribute('aria-describedby');
  });
});
