// Tests for the comparison and the model choice: the choice comes first, the model off makes both plans here with
// no plan request, a new pick clears them, and a failed air read retries.
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SAMPLE_HOUSEHOLDS } from '../../../src/features/household/samples.js';
import { CompareView } from '../../../src/ui/compare/CompareView.js';
import { CONSENT } from '../../../src/ui/consent/strings.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { airResponse, announced, json, saveSample, stubApi } from '../plan/fixtures.js';
import { renderInApp } from '../helpers.js';

const renderCompare = () =>
  renderInApp(
    <Announcer>
      <CompareView />
    </Announcer>,
  );

const index = String(SAMPLE_HOUSEHOLDS.findIndex((found) => found.id === 'older-couple-chulha'));

beforeEach(() => {
  window.localStorage.clear();
});

describe('useComparison', () => {
  it('asks for the model choice before comparing', async () => {
    saveSample('family-car-asthma', 'en', null);
    stubApi({});
    renderCompare();
    expect(screen.getByRole('heading', { name: CONSENT.title })).toBeInTheDocument();
    expect(screen.getByText(CONSENT.offCompare)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: CONSENT.off }));
    expect(screen.getByRole('button', { name: 'Compare' })).toBeInTheDocument();
  });

  it('with the model off makes both plans here, sends no plan request, and clears them on a new pick', async () => {
    saveSample('family-car-asthma', 'en', 'off');
    const fetcher = stubApi({ '/api/air': () => json(airResponse('poor')) });
    renderCompare();
    await userEvent.selectOptions(screen.getByLabelText('Compare with'), index);
    const button = screen.getByRole('button', { name: 'Compare' });
    await screen.findByRole('button', { name: 'Compare' });
    await userEvent.click(button);
    expect(await screen.findByRole('heading', { name: 'Sample household' })).toBeInTheDocument();
    expect(announced()).toBe('The comparison is ready.');
    expect(fetcher.mock.calls.map(([url]) => url.split('?')[0])).toEqual(['/api/air']);
    await userEvent.selectOptions(screen.getByLabelText('Compare with'), '0');
    expect(screen.queryByRole('heading', { name: 'Sample household' })).toBeNull();
  });

  it('with the model off retries a failed air read', async () => {
    saveSample('family-car-asthma', 'en', 'off');
    const fetcher = stubApi({
      '/api/air': () => json({ error: { code: 'internal', message: 'No.', issues: [] } }, 500),
    });
    renderCompare();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.queryByRole('heading', { name: 'Sample household' })).toBeNull();
    await userEvent.click(retry);
    expect(fetcher.mock.calls.length).toBeGreaterThan(1);
  });
});
