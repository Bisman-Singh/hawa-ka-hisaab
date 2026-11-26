// Tests for the when and how of an outing: times, whether it can move, and a trip whose vehicle fields appear
// only for a car, taxi, two wheeler or auto rickshaw.
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Draft, DraftActivity } from '../../../src/ui/household/draft.js';
import { emptyDraft } from '../../../src/ui/household/draft.js';
import { TripFields } from '../../../src/ui/household/TripFields.js';
import { replaceAt } from '../../../src/ui/household/edits.js';
import { axeViolations } from '../helpers.js';
import { renderForm } from './harness.js';

const outing: DraftActivity = {
  id: 'a1',
  memberIds: ['m1'],
  kind: 'commute',
  label: null,
  start: '08:30',
  minutes: '45',
  timing: 'fixed',
  setting: 'in_transit',
  travel: null,
};

const withOuting = (activity: DraftActivity): Draft => ({ ...emptyDraft(), activities: [activity] });

function mount(activity: DraftActivity) {
  return renderForm(withOuting(activity), (form) => {
    const current = form.draft.activities[0] ?? activity;
    return (
      <TripFields
        activity={current}
        path={(...rest) => form.at('activities', 0, ...rest)}
        set={(next) => {
          form.edit({ ...form.draft, activities: replaceAt(form.draft.activities, 0, next) });
        }}
      />
    );
  });
}

describe('TripFields', () => {
  it('writes the times and whether the time can move', async () => {
    const { draft } = mount(outing);
    await userEvent.clear(screen.getByRole('textbox', { name: 'Minutes, all in' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Minutes, all in' }), '30');
    await userEvent.click(screen.getByRole('radio', { name: 'Can move' }));
    expect(screen.getByLabelText('Starts at')).toHaveAttribute('type', 'time');
    expect(draft()?.activities[0]).toMatchObject({ minutes: '30', timing: 'flexible' });
  });

  it('asks fuel and people only for a vehicle, and drops the trip for no travel', async () => {
    const { draft, container } = mount(outing);
    expect(screen.queryByRole('textbox', { name: 'Km, one way' })).toBeNull();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Travel by' }), 'Car');
    expect(screen.getByRole('combobox', { name: 'Fuel' })).toHaveValue('unknown');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Fuel' }), 'CNG');
    await userEvent.type(screen.getByRole('textbox', { name: 'Km, one way' }), '14');
    await userEvent.type(screen.getByRole('textbox', { name: 'People in it' }), '2');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Same way back' }));
    expect(draft()?.activities[0]?.travel).toEqual({
      mode: 'car',
      fuel: 'cng',
      km: '14',
      people: '2',
      roundTrip: false,
    });
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Travel by' }), 'Cycle');
    expect(screen.queryByRole('combobox', { name: 'Fuel' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'People in it' })).toBeNull();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Travel by' }), 'No travel');
    expect(draft()?.activities[0]?.travel).toBeNull();
  });

  it('shows a read car with no fuel as not known', () => {
    mount({ ...outing, travel: { mode: 'car', fuel: null, km: '', people: '', roundTrip: true } });
    expect(screen.getByRole('combobox', { name: 'Fuel' })).toHaveValue('unknown');
  });
});
