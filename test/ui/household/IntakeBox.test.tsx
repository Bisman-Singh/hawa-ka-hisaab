// Tests for the intake box: samples, the model note before sending, the choice it keeps, the model off for this
// browser, and each outcome of reading the text.
import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_HOUSEHOLDS } from '../../../src/features/household/samples.js';
import { IntakeBox } from '../../../src/ui/household/IntakeBox.js';
import { readIntake, setIntake } from '../../../src/ui/household/intake-store.js';
import { loadState, saveState } from '../../../src/ui/storage.js';
import { sampleHousehold, sampleTrace } from '../../support/samples.js';
import { axeViolations, renderInApp } from '../helpers.js';
import { json } from '../place/air-fixtures.js';

function stubIntake(respond: () => Promise<Response>) {
  const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(respond);
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const box = () => screen.getByRole('textbox', { name: 'Who is at home and how does your day go?' });
const send = () => screen.getByRole('button', { name: 'Read it with the model' });

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  setIntake(null);
});

describe('IntakeBox', () => {
  it('starts from the text that was read last, so changing it does not mean typing it again', () => {
    setIntake({
      text: 'Two adults and a child.',
      response: {
        outcome: 'parsed',
        household: sampleHousehold(),
        unplaced: [],
        assumed: [],
        trace: sampleTrace(),
      },
    });
    renderInApp(<IntakeBox />);
    expect(box()).toHaveValue('Two adults and a child.');
  });

  it('keeps focus in the page when the model is turned on: it moves to the read button', async () => {
    saveState(window.localStorage, { ...loadState(window.localStorage), modelChoice: 'off' });
    renderInApp(<IntakeBox />);
    await userEvent.click(screen.getByRole('button', { name: 'Turn the model on' }));
    expect(send()).toHaveFocus();
  });

  it('shows the privacy note and three real samples, and copies a sample into the box', async () => {
    const { container } = renderInApp(<IntakeBox />);
    expect(box()).not.toHaveAccessibleDescription(/Gemini/);
    expect(screen.getByRole('button', { name: 'Read it with the model' })).toHaveAccessibleDescription(
      /Google's Gemini model/,
    );
    const samples = container.querySelectorAll('.samples q');
    expect([...samples].map((quote) => quote.textContent)).toEqual(
      SAMPLE_HOUSEHOLDS.slice(0, 3).map((sample) => sample.description),
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Use this, 2 of 3' })[0] ?? document.body);
    expect(box()).toHaveValue(SAMPLE_HOUSEHOLDS[1]?.description);
    expect(box()).toHaveFocus();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('says what goes to the model and asks for no names, and its hint and note agree on conditions', () => {
    renderInApp(<IntakeBox />);
    const read = screen.getByRole('button', { name: 'Read it with the model' });
    expect(read).toHaveAccessibleDescription(/conditions as general flags such as asthma or pregnancy/);
    expect(read).toHaveAccessibleDescription(/Do not add names, record numbers/);
    expect(box()).toHaveAccessibleDescription(/any condition such as asthma or a heart condition/);
    expect(read).toHaveAccessibleDescription(/Google may use what is sent to improve its products/);
    expect(screen.getByRole('link', { name: 'More on the privacy page' })).toHaveAttribute(
      'href',
      '?view=privacy',
    );
  });

  it('keeps the choice to use the model when the text is sent to be read', async () => {
    window.localStorage.clear();
    stubIntake(() =>
      Promise.resolve(json({ outcome: 'unavailable', reason: 'quota', trace: sampleTrace() })),
    );
    renderInApp(<IntakeBox />);
    await userEvent.type(box(), 'Two adults.');
    await userEvent.click(send());
    expect(loadState(window.localStorage).modelChoice).toBe('on');
  });

  it('with the model off for this browser sends nothing and offers the hand form or turning the model on', async () => {
    saveState(window.localStorage, {
      version: 1,
      household: null,
      location: null,
      place: null,
      language: 'en',
      modelChoice: 'off',
    });
    const fetcher = stubIntake(() => Promise.resolve(json({})));
    renderInApp(<IntakeBox />);
    expect(screen.queryByRole('button', { name: 'Read it with the model' })).toBeNull();
    expect(screen.getByText(/so a description cannot be read/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fill the form by hand' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Turn the model on' }));
    expect(loadState(window.localStorage).modelChoice).toBe('on');
    expect(send()).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    window.localStorage.clear();
  });

  it('opens the hand form with the reason when the model is unavailable, never an error page', async () => {
    stubIntake(() =>
      Promise.resolve(json({ outcome: 'unavailable', reason: 'quota', trace: sampleTrace() })),
    );
    renderInApp(<IntakeBox />);
    await userEvent.type(box(), 'Two adults and a child with asthma.');
    await userEvent.click(send());
    await waitFor(() => {
      expect(window.location.search).toBe('?view=household');
    });
    expect(readIntake()?.response).toMatchObject({ outcome: 'unavailable', reason: 'quota' });
    expect(readIntake()?.text).toBe('Two adults and a child with asthma.');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the parsed household for the household view and moves there', async () => {
    const reply = { household: sampleHousehold(), unplaced: [], assumed: [], trace: sampleTrace() };
    const fetcher = stubIntake(() => Promise.resolve(json({ outcome: 'parsed', ...reply })));
    renderInApp(<IntakeBox />);
    await userEvent.type(box(), 'Two adults, a child.');
    await userEvent.click(send());
    await waitFor(() => {
      expect(readIntake()?.response.outcome).toBe('parsed');
    });
    expect(window.location.search).toBe('?view=household');
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ text: 'Two adults, a child.' }));
  });

  it('says why nothing was sent for an empty or too long text, and moves focus to the box', async () => {
    const fetcher = stubIntake(() => Promise.reject(new Error('not called')));
    renderInApp(<IntakeBox />);
    await userEvent.click(send());
    expect(box()).toHaveAccessibleDescription(/Write a few words about your household first/);
    expect(box()).toHaveFocus();
    act(() => {
      box().focus();
    });
    await userEvent.paste('a'.repeat(2001));
    expect(screen.getByText('2001 of 2000 characters.')).toBeInTheDocument();
    await userEvent.click(send());
    expect(box()).toHaveAccessibleDescription(/This is 2001 characters. Keep it to 2000./);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('shows a failed request with a retry, keeps the text and sends again', async () => {
    const fetcher = stubIntake(() => Promise.reject(new TypeError('offline')));
    renderInApp(<IntakeBox />);
    await userEvent.type(box(), 'One adult.');
    await userEvent.click(send());
    expect(await screen.findByRole('alert')).toHaveTextContent('No connection');
    expect(box()).toHaveValue('One adult.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it('says it is reading while the request runs and blocks a second send without losing focus', async () => {
    const fetcher = stubIntake(() => new Promise(() => undefined));
    renderInApp(<IntakeBox />);
    await userEvent.type(box(), 'One adult.');
    await userEvent.click(send());
    expect(screen.getByRole('status')).toHaveTextContent('Reading your household');
    expect(send()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(send());
    expect(send()).toHaveFocus();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
