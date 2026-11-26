// Tests for checkboxes: a group adds and removes values, its problem is tied to the group, and the first box
// carries the field id.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Check, Checks } from '../../../src/ui/household/checks.js';
import { axeViolations } from '../helpers.js';

const OPTIONS = { m1: 'Person 1, adult', m2: 'Person 2, child' };

describe('Checks', () => {
  it('adds a ticked value and removes an unticked one', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <Checks
        id="who"
        error={undefined}
        legend="Who goes"
        options={OPTIONS}
        value={['m1']}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Person 2, child' }));
    expect(onChange).toHaveBeenLastCalledWith(['m1', 'm2']);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Person 1, adult' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByRole('checkbox', { name: 'Person 1, adult' })).toHaveAttribute('id', 'who');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('ties its problem to the group', () => {
    render(
      <Checks
        id="who"
        error="Tick who goes."
        legend="Who goes"
        options={OPTIONS}
        value={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('group', { name: 'Who goes' })).toHaveAccessibleDescription('Tick who goes.');
  });
});

describe('Check', () => {
  it('passes its new state on', async () => {
    const onChange = vi.fn();
    render(<Check id="back" label="Same way back" value onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Same way back' }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
