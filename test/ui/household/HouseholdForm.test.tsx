// Tests for the whole form: save offers today's plan by its view id, a browser that does not keep the household
// is named, problems are counted, and the way back fits where the form came from.
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyDraft } from '../../../src/ui/household/draft.js';
import { HouseholdForm } from '../../../src/ui/household/HouseholdForm.js';
import { renderForm } from './harness.js';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('HouseholdForm', () => {
  it('offers today’s plan after a save and moves there by its view id', async () => {
    renderForm(emptyDraft(), (form) => <HouseholdForm form={form} kept fromText={false} />);
    expect(screen.getByRole('link', { name: 'Back to the start' })).toHaveAttribute('href', './');
    await userEvent.click(screen.getByRole('button', { name: 'Save household' }));
    expect(screen.getByRole('heading', { name: 'Saved in this browser' })).toBeInTheDocument();
    const plan = screen.getByRole('button', { name: "Make today's plan" });
    await waitFor(() => {
      expect(plan).toHaveFocus();
    });
    await userEvent.click(plan);
    expect(window.location.search).toBe('?view=plan');
  });

  it('says when this browser is not keeping the household, and offers the text again when it came from one', async () => {
    renderForm(emptyDraft(), (form) => <HouseholdForm form={form} kept={false} fromText />);
    expect(screen.getByRole('link', { name: 'Change what you wrote' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save household' }));
    expect(
      screen.getByRole('heading', { name: 'This browser is not keeping your household' }),
    ).toBeInTheDocument();
    expect(screen.getByText('It stays until this page is closed.')).toBeInTheDocument();
  });

  it('counts the problems after a failed save', async () => {
    renderForm({ ...emptyDraft(), members: [] }, (form) => (
      <HouseholdForm form={form} kept fromText={false} />
    ));
    await userEvent.click(screen.getByRole('button', { name: 'Save household' }));
    expect(
      screen.getByText('1 field needs a fix. The first is in focus.', { selector: 'b' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Make today's plan" })).toBeNull();
  });
});
