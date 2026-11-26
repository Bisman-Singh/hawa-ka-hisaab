// Tests for the segmented choice: native radios in a fieldset, arrow keys move the choice, Hindi marked.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Segmented } from '../../../src/ui/components/Segmented.js';
import { axeViolations } from '../helpers.js';

function Language(): ReactElement {
  const [value, setValue] = useState<'en' | 'hi'>('en');
  return (
    <>
      <Segmented
        legend="Plan language"
        value={value}
        onChange={setValue}
        options={[
          { value: 'en', label: 'English' },
          { value: 'hi', label: 'हिन्दी', lang: 'hi' },
        ]}
      />
      <p>chosen {value}</p>
    </>
  );
}

describe('Segmented', () => {
  it('groups radios under the legend and moves the choice with arrow keys', async () => {
    const { container } = render(<Language />);
    expect(screen.getByRole('group', { name: 'Plan language' })).toBeInTheDocument();
    const english = screen.getByRole('radio', { name: 'English' });
    expect(english).toBeChecked();
    expect(screen.getByText('हिन्दी')).toHaveAttribute('lang', 'hi');
    english.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'हिन्दी' })).toBeChecked();
    expect(screen.getByText('chosen hi')).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('takes a name when two groups must not share one', () => {
    render(
      <Segmented
        legend="What if he goes by"
        name="ride"
        value="auto"
        onChange={() => undefined}
        options={[{ value: 'auto', label: 'Shared auto' }]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Shared auto' })).toHaveAttribute('name', 'ride');
  });
});
