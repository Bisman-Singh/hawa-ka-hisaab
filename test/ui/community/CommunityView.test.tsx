// Tests for the community view: a sample fills the form and sends the real input, the facts, actions and the
// notice in English and Hindi show, copy uses the plain text, print prints, failures retry, and axe passes.
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { noticeToPlainText } from '../../../src/features/community/notice.js';
import { noticeRequestSchema } from '../../../src/features/community/contract.js';
import { CommunityView } from '../../../src/ui/community/CommunityView.js';
import { CONSENT } from '../../../src/ui/consent/words.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { axeViolations, fakeDialog, renderInApp } from '../helpers.js';
import {
  airResponse,
  announced,
  communityAt,
  DELHI,
  json,
  noticeResponse,
  saveSample,
  sentBody,
  stubApi,
} from '../plan/fixtures.js';

const renderCommunity = () =>
  renderInApp(
    <Announcer>
      <CommunityView />
    </Announcer>,
  );

function stubClipboard(writeText: (text: string) => Promise<void>) {
  const spy = vi.fn(writeText);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: spy } });
  return spy;
}

beforeEach(() => {
  window.localStorage.clear();
  fakeDialog();
});

describe('CommunityView', () => {
  it('sends a sample as the real input and shows facts, actions and both notices', async () => {
    saveSample();
    const response = noticeResponse(0);
    const fetcher = stubApi({ '/api/notice': () => json(response) });
    const { container } = renderCommunity();
    const sample = communityAt(0);
    await userEvent.click(screen.getByRole('button', { name: /A housing society of 120 flats/ }));
    expect(screen.getByLabelText('Homes (needed)')).toHaveValue('120');
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(
      await screen.findByRole('heading', { name: 'Facts for this housing society' }),
    ).toBeInTheDocument();
    const body = noticeRequestSchema.parse(sentBody(fetcher, 0));
    expect(body).toEqual({ community: sample, location: DELHI });
    expect(screen.getByText(response.notice.en.title)).toBeInTheDocument();
    const hindi = screen.getByRole('article', { name: 'हिन्दी में सूचना' });
    expect(hindi).toHaveAttribute('lang', 'hi');
    expect(within(container.querySelector('ol.acts') ?? document.body).getAllByRole('listitem')).toHaveLength(
      response.actions.length,
    );
    expect(announced()).toBe('The facts and the notice are ready.');
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('copies the plain text of each notice and says when copying did not work', async () => {
    saveSample();
    const response = noticeResponse(1);
    stubApi({ '/api/notice': () => json(response) });
    renderCommunity();
    await userEvent.click(screen.getByRole('button', { name: /A primary school with 400 pupils/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    await screen.findByRole('heading', { name: 'Facts for this school' });
    const spy = stubClipboard(() => Promise.resolve());
    await userEvent.click(screen.getByRole('button', { name: 'Copy English' }));
    expect(spy).toHaveBeenCalledWith(noticeToPlainText(response.notice.en));
    await waitFor(() => {
      expect(announced()).toBe('Copied the notice text.');
    });
    stubClipboard(() => Promise.reject(new Error('denied')));
    await userEvent.click(screen.getByRole('button', { name: 'Copy Hindi' }));
    await waitFor(() => {
      expect(announced()).toBe('Copy did not work here. Select the notice text and copy it.');
    });
    const hidden: string[] = [];
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      hidden.push(
        ...[...document.querySelectorAll('.notice.no-print')].map((node) => node.getAttribute('lang') ?? ''),
      );
    });
    await userEvent.click(screen.getByRole('button', { name: 'Print Hindi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Print English' }));
    expect(print).toHaveBeenCalledTimes(2);
    expect(hidden).toEqual(['en', 'hi']);
    expect(document.querySelectorAll('.notice.no-print')).toHaveLength(0);
  });

  it('says there is no Hindi notice when the rules path had none, and offers no Hindi copy', async () => {
    saveSample();
    stubApi({ '/api/notice': () => json(noticeResponse(0, false)) });
    renderCommunity();
    await userEvent.click(screen.getByRole('button', { name: /A housing society of 120 flats/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(await screen.findByText(/came without a Hindi version/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy Hindi' })).toBeNull();
    expect(screen.getByText('Wording by fixed rules')).toBeInTheDocument();
  });

  it('refuses a form with no home count in place, then waits, fails and retries', async () => {
    saveSample();
    let calls = 0;
    stubApi({
      '/api/notice': () => {
        calls += 1;
        return calls === 1 ? json({}, 500) : json(noticeResponse(0));
      },
    });
    renderCommunity();
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    const homes = screen.getByLabelText('Homes (needed)');
    expect(homes).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(homes);
    expect(screen.getByText('Enter the number of homes, from 1 to 10000.')).toBeInTheDocument();
    await userEvent.type(homes, '80');
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(
      await screen.findByRole('heading', { name: 'The server did not answer properly' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Facts for this housing society' }),
    ).toBeInTheDocument();
  });

  it('has the error in the description of the field at the moment focus lands on it', async () => {
    saveSample();
    stubApi({});
    renderCommunity();
    const homes = screen.getByLabelText('Homes (needed)');
    const seen: string[] = [];
    homes.addEventListener('focus', () => {
      const ids = (homes.getAttribute('aria-describedby') ?? '').split(' ');
      seen.push(ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' | '));
    });
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatch(/^Enter the number of homes, from 1 to 10000\./);
  });

  it('names the pupils range for a school, and says what is needed and what is optional', async () => {
    saveSample();
    stubApi({});
    renderCommunity();
    expect(screen.getByText(/Fields marked needed must be filled in/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'School' }));
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(screen.getByLabelText('Pupils (needed)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter the number of pupils, from 1 to 20000.')).toBeInTheDocument();
  });

  it('says so when a sample is loaded into the form', async () => {
    saveSample();
    stubApi({});
    renderCommunity();
    await userEvent.click(screen.getByRole('button', { name: /A housing society of 120 flats/ }));
    expect(announced()).toBe('Sample loaded into the form.');
  });

  it('keeps the focus on the send button while a notice is worked out, and sends once', async () => {
    saveSample();
    const fetcher = stubApi({ '/api/notice': () => new Promise<Response>(() => undefined) });
    renderCommunity();
    await userEvent.type(screen.getByLabelText('Homes (needed)'), '80');
    const send = screen.getByRole('button', { name: 'Work out the facts' });
    await userEvent.click(send);
    await userEvent.click(send);
    expect(send).toHaveFocus();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('moves focus to the heading when the model choice that was pressed goes away', async () => {
    saveSample('family-car-asthma', 'en', null);
    stubApi({ '/api/air': () => json(airResponse()), '/api/notice': () => json(noticeResponse(0)) });
    renderCommunity();
    await userEvent.type(screen.getByLabelText('Homes (needed)'), '80');
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    await userEvent.click(await screen.findByRole('button', { name: CONSENT.use }));
    expect(screen.getByRole('heading', { level: 1, name: 'Society or school' })).toHaveFocus();
  });

  it('shows the waiting line while the notice is worked out', async () => {
    saveSample();
    stubApi({ '/api/notice': () => new Promise<Response>(() => undefined) });
    renderCommunity();
    await userEvent.type(screen.getByLabelText('Homes (needed)'), '80');
    await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
    expect(screen.getByText('Working out the facts and the notice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Work out the facts' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('asks for a place first', () => {
    stubApi({});
    renderCommunity();
    expect(screen.getByRole('heading', { level: 1, name: 'Society or school' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set your place' })).toBeInTheDocument();
  });
});
