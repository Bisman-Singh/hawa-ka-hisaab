// Tests for the model note and choice: the note links to the privacy page, each button keeps its choice in this
// browser and tells the caller, and the switch shows and flips the choice.
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModelChoice, ModelNote, ModelSwitch } from '../../../src/ui/consent/ModelChoice.js';
import { CONSENT } from '../../../src/ui/consent/strings.js';
import { loadState } from '../../../src/ui/storage.js';
import { axeViolations, renderInApp } from '../helpers.js';

afterEach(() => {
  window.localStorage.clear();
});

describe('ModelNote', () => {
  it('states the note, opens it with a lead where asked, and links to the privacy page', () => {
    const { rerender } = renderInApp(<ModelNote id="n" />);
    expect(screen.queryByText(CONSENT.lead)).toBeNull();
    rerender(<ModelNote id="n" lead={CONSENT.lead} />);
    expect(screen.getByText(CONSENT.lead)).toBeInTheDocument();
    expect(screen.getByText(CONSENT.terms)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: CONSENT.more })).toHaveAttribute('href', '?view=privacy');
  });
});

describe('ModelChoice', () => {
  it('keeps the choice to use the model and tells the caller', async () => {
    const onChoose = vi.fn();
    const { container } = renderInApp(<ModelChoice without={CONSENT.offPlan} onChoose={onChoose} />);
    expect(screen.getByRole('heading', { name: CONSENT.title })).toBeInTheDocument();
    expect(screen.getByText(CONSENT.offPlan)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: CONSENT.use }));
    expect(loadState(window.localStorage).modelChoice).toBe('on');
    expect(onChoose).toHaveBeenCalledWith('on');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('keeps the choice to leave the model off, with no caller to tell', async () => {
    renderInApp(<ModelChoice without={CONSENT.offNotice} />);
    await userEvent.click(screen.getByRole('button', { name: CONSENT.off }));
    expect(loadState(window.localStorage).modelChoice).toBe('off');
  });
});

describe('ModelSwitch', () => {
  it('says no choice is made yet, then flips between on and off', async () => {
    renderInApp(<ModelSwitch />);
    expect(screen.getByText(CONSENT.notChosen)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: CONSENT.turnOn }));
    expect(screen.getByText(CONSENT.state.on)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: CONSENT.turnOff }));
    expect(screen.getByText(CONSENT.state.off)).toBeInTheDocument();
    expect(loadState(window.localStorage).modelChoice).toBe('off');
  });
});
