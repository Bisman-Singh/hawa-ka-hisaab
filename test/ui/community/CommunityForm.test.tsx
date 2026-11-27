// Tests for the community form: a school asks for pupils and the assembly time, a generator asks for its hours,
// periods can be added and removed, a bad period is refused on the first period's start, and axe passes.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommunityFormView } from '../../../src/ui/community/CommunityForm.js';
import { axeViolations } from '../helpers.js';

describe('CommunityFormView', () => {
  it('asks a school for pupils and its assembly, and a generator for its hours, and sends the input', async () => {
    const onSend = vi.fn();
    const { container } = render(<CommunityFormView onSend={onSend} busy={false} />);
    await userEvent.click(screen.getByRole('radio', { name: 'School' }));
    expect(screen.queryByLabelText('Children living here')).toBeNull();
    await userEvent.type(screen.getByLabelText('Pupils (needed)'), '300');
    await userEvent.type(screen.getByLabelText('Morning assembly outdoors at'), '07:45');
    await userEvent.click(screen.getByRole('radio', { name: 'Diesel' }));
    await userEvent.type(screen.getByLabelText('Generator hours a day (needed)'), '3');
    await userEvent.click(screen.getByRole('radio', { name: 'Often' }));
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'school',
        pupils: 300,
        assembly: '07:45',
        generator: { hoursPerDay: 3, kva: null, fuel: 'diesel' },
        wasteBurning: 'often',
      }),
    );
  }, 30_000);

  it('adds and removes outdoor periods and refuses a period that is too short', async () => {
    const onSend = vi.fn();
    render(<CommunityFormView onSend={onSend} busy={false} />);
    await userEvent.type(screen.getByLabelText('Homes (needed)'), '50');
    await userEvent.click(screen.getByRole('button', { name: 'Add an outdoor period' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add an outdoor period' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove this period 2' }));
    expect(screen.queryByLabelText('Period 2, Starts at')).toBeNull();
    await userEvent.type(screen.getByLabelText('Period 1, Starts at'), '17:00');
    await userEvent.type(screen.getByLabelText('Period 1, Minutes'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByText(/Give each period a start time/)).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText('Period 1, Starts at'));
    await userEvent.clear(screen.getByLabelText('Period 1, Minutes'));
    await userEvent.type(screen.getByLabelText('Period 1, Minutes'), '60');
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({ homes: 50, outdoorPeriods: [{ start: '17:00', durationMinutes: 60 }] }),
    );
  });

  it('stops adding periods at the most the schema takes, and keeps the button off while busy', async () => {
    render(<CommunityFormView onSend={vi.fn()} busy />);
    const add = screen.getByRole('button', { name: 'Add an outdoor period' });
    for (let count = 0; count < 12; count += 1) {
      await userEvent.click(add);
    }
    expect(add).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Work out the facts' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('names a bad number on its own field, and edits one period without touching another', async () => {
    const onSend = vi.fn();
    render(<CommunityFormView onSend={onSend} busy={false} />);
    await userEvent.type(screen.getByLabelText('Homes (needed)'), '50');
    await userEvent.type(screen.getByLabelText('Guards, sweepers and other outdoor staff'), 'nine');
    await userEvent.click(screen.getByRole('button', { name: 'Add an outdoor period' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add an outdoor period' }));
    await userEvent.type(screen.getByLabelText('Period 1, Starts at'), '06:30');
    await userEvent.type(screen.getByLabelText('Period 1, Minutes'), '30');
    await userEvent.type(screen.getByLabelText('Period 2, Starts at'), '17:00');
    await userEvent.type(screen.getByLabelText('Period 2, Minutes'), '45');
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(screen.getByText('Enter a number from 0 to 2000, or leave it blank.')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText('Guards, sweepers and other outdoor staff'));
    await userEvent.clear(screen.getByLabelText('Guards, sweepers and other outdoor staff'));
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        outdoorPeriods: [
          { start: '06:30', durationMinutes: 30 },
          { start: '17:00', durationMinutes: 45 },
        ],
      }),
    );
  });
});
