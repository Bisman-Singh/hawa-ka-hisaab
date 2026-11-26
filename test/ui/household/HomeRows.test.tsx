// Tests for the home block: cooking fuel and smoke sources, rooms with area and an optional purifier CADR, add
// with focus and removal with undo.
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { emptyDraft } from '../../../src/ui/household/draft.js';
import { HomeRows } from '../../../src/ui/household/HomeRows.js';
import { axeViolations } from '../helpers.js';
import { renderForm } from './harness.js';

describe('HomeRows', () => {
  it('writes the cooking fuel and what burns at home', async () => {
    const { draft, container } = renderForm(emptyDraft(), (form) => <HomeRows form={form} />);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Cooking fuel' }),
      'Wood, dung or crop waste',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Incense' }));
    expect(draft()?.home).toMatchObject({ cookingFuel: 'biomass', indoorSources: ['incense'] });
    expect(await axeViolations(container)).toEqual([]);
  });

  it('adds a room with focus on its kind, asks the CADR only with a purifier, and removes with undo', async () => {
    const { draft } = renderForm(emptyDraft(), (form) => <HomeRows form={form} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add a room' }));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Room' })).toHaveFocus();
    });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Room' }), 'Living room');
    await userEvent.type(screen.getByRole('textbox', { name: 'Area, sq ft' }), '220');
    expect(screen.queryByRole('textbox', { name: 'Purifier CADR, m³/h' })).toBeNull();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Air purifier in this room' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Purifier CADR, m³/h' }), '250');
    expect(draft()?.home.rooms).toEqual([
      { id: 'r1', kind: 'living', area: '220', purifier: true, cadr: '250' },
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Room 1, Living room' }));
    expect(draft()?.home.rooms).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(draft()?.home.rooms).toHaveLength(1);
  });
});
