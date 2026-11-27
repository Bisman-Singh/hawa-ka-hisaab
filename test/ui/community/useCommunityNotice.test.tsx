// Tests for the community notice and the model choice: a send waits for the choice, the model off makes the
// notice here from the air alone, and a failed air read retries.
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CommunityView } from '../../../src/ui/community/CommunityView.js';
import { CONSENT } from '../../../src/ui/consent/words.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { fakeDialog, renderInApp } from '../helpers.js';
import { airResponse, announced, json, noticeResponse, saveSample, stubApi } from '../plan/fixtures.js';

const renderCommunity = () =>
  renderInApp(
    <Announcer>
      <CommunityView />
    </Announcer>,
  );

const paths = (fetcher: ReturnType<typeof stubApi>): string[] =>
  fetcher.mock.calls.map(([url]) => url.split('?')[0] ?? '');

async function sendSample(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /A housing society of 120 flats/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Work out the facts' }));
}

beforeEach(() => {
  window.localStorage.clear();
  fakeDialog();
});

describe('useCommunityNotice', () => {
  it('holds a send until the model choice is made, then sends it with the model on', async () => {
    saveSample('family-car-asthma', 'en', null);
    const fetcher = stubApi({ '/api/notice': () => json(noticeResponse(0)) });
    renderCommunity();
    await sendSample();
    expect(screen.getByText(CONSENT.offNotice)).toBeInTheDocument();
    expect(paths(fetcher)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: CONSENT.use }));
    expect(
      await screen.findByRole('heading', { name: 'Facts for this housing society' }),
    ).toBeInTheDocument();
    expect(paths(fetcher)).toEqual(['/api/notice']);
  });

  it('with the model off makes the notice here from the air alone', async () => {
    saveSample('family-car-asthma', 'en', null);
    const fetcher = stubApi({ '/api/air': () => json(airResponse('very_poor')) });
    renderCommunity();
    await sendSample();
    await userEvent.click(screen.getByRole('button', { name: CONSENT.off }));
    expect(
      await screen.findByRole('heading', { name: 'Facts for this housing society' }),
    ).toBeInTheDocument();
    expect(paths(fetcher)).toEqual(['/api/air']);
    expect(announced()).toBe('The facts and the notice are ready.');
    await sendSample();
    expect(paths(fetcher)).toEqual(['/api/air']);
  });

  it('with the model off retries a failed air read', async () => {
    saveSample('family-car-asthma', 'en', 'off');
    const fetcher = stubApi({
      '/api/air': () => json({ error: { code: 'internal', message: 'No.', issues: [] } }, 500),
    });
    renderCommunity();
    await sendSample();
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(paths(fetcher).length).toBeGreaterThan(1);
  });
});
