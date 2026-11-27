// Tests for the clear control: it asks first, Keep them changes nothing, Yes clears storage and the typed text and
// says what it cleared, Undo puts it back, focus follows each step, and nothing kept says so.
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { readIntake, setIntake } from '../../../src/ui/household/intake-store.js';
import { ClearHousehold } from '../../../src/ui/legal/ClearHousehold.js';
import { PRIVACY } from '../../../src/ui/legal/words.js';
import { loadState, STORAGE_KEY } from '../../../src/ui/storage.js';
import { sampleTrace } from '../../support/samples.js';
import { axeViolations, renderInApp } from '../helpers.js';
import { announced, saveSample } from '../plan/fixtures.js';

const clear = () =>
  renderInApp(
    <Announcer>
      <ClearHousehold id="c" />
    </Announcer>,
  );

afterEach(() => {
  window.localStorage.clear();
  setIntake(null);
});

describe('ClearHousehold', () => {
  it('says so when this browser keeps nothing', () => {
    clear();
    expect(screen.getByText(PRIVACY.nothing)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('asks first, and Keep them leaves everything as it was', async () => {
    saveSample();
    const { container } = clear();
    await userEvent.click(screen.getByRole('button', { name: PRIVACY.clearButton }));
    expect(screen.getByText(PRIVACY.confirm).closest('p')).toHaveFocus();
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: PRIVACY.no }));
    expect(screen.getByRole('button', { name: PRIVACY.clearButton })).toHaveFocus();
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('clears storage and the typed text on Yes, says what it cleared, and Undo puts the saved part back', async () => {
    saveSample();
    setIntake({
      text: 'Two adults.',
      response: { outcome: 'unavailable', reason: 'disabled', trace: sampleTrace() },
    });
    clear();
    await userEvent.click(screen.getByRole('button', { name: PRIVACY.clearButton }));
    await userEvent.click(screen.getByRole('button', { name: PRIVACY.yes }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(readIntake()).toBeNull();
    expect(screen.getByText(PRIVACY.cleared, { selector: '.actions p' })).toBeInTheDocument();
    expect(document.querySelector('.actions [role="status"]')).toBeNull();
    expect(announced()).toBe(PRIVACY.cleared);
    expect(screen.getByRole('button', { name: PRIVACY.undo })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: PRIVACY.undo }));
    expect(loadState(window.localStorage)).toMatchObject({ modelChoice: 'on', location: { lat: 28.54 } });
    expect(announced()).toBe(PRIVACY.restored);
    expect(screen.getByRole('button', { name: PRIVACY.clearButton })).toHaveFocus();
  });
});
