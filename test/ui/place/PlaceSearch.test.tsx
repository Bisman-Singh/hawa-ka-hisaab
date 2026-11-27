// Tests for place search: one match chosen at once, a list for several, not found, a failed search with a retry,
// a blank search, and device location, with focus moved and results announced.
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { PlaceSearch } from '../../../src/ui/place/PlaceSearch.js';
import { axeViolations } from '../helpers.js';
import { json, pinPlace, stubFetch, townPlace } from './air-fixtures.js';

const field = () => screen.getByRole('textbox', { name: 'City, town or PIN code' });
const find = async (text: string) => {
  await userEvent.clear(field());
  if (text !== '') {
    await userEvent.type(field(), text);
  }
  await userEvent.click(screen.getByRole('button', { name: 'Find' }));
};
const mount = (onChoose = vi.fn()) => {
  const view = render(
    <Announcer>
      <PlaceSearch onChoose={onChoose} />
    </Announcer>,
  );
  return { ...view, onChoose };
};
const live = () => document.querySelector('.vh[role="status"]');

describe('PlaceSearch', () => {
  it('chooses a single match at once with its point', async () => {
    const fetcher = stubFetch(() => json({ places: [pinPlace()] }));
    const { onChoose, container } = mount();
    await find('110092');
    await waitFor(() => {
      expect(onChoose).toHaveBeenCalledWith(pinPlace(), { lat: 28.64, lon: 77.3 });
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/places?q=110092');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('lists an ambiguous name, moves focus to the first choice and announces the count', async () => {
    const lucknow = townPlace();
    const other = townPlace({ id: 'place-2', label: 'Lucknow, Hardoi, Uttar Pradesh', lat: 27.4 });
    stubFetch(() => json({ places: [lucknow, other] }));
    const { onChoose } = mount();
    await find('Lucknow');
    const first = await screen.findByRole('button', { name: 'Lucknow, Uttar Pradesh' });
    await waitFor(() => {
      expect(first).toHaveFocus();
    });
    expect(live()).toHaveTextContent('2 places match. Choose one.');
    await userEvent.click(screen.getByRole('button', { name: 'Lucknow, Hardoi, Uttar Pradesh' }));
    expect(onChoose).toHaveBeenCalledWith(other, { lat: 27.4, lon: 80.92 });
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('ties a place not found to the field, moves focus there, and searches again on request', async () => {
    const fetcher = stubFetch(() => json({ places: [] }));
    mount();
    await find('Lukhnow');
    await waitFor(() => {
      expect(field()).toHaveAccessibleDescription(
        'No place in India matches “Lukhnow”. Check the spelling, or try a PIN code.',
      );
    });
    expect(field()).toHaveFocus();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(live()).toHaveTextContent('No place in India matches “Lukhnow”.');
    await userEvent.click(screen.getByRole('button', { name: 'Find' }));
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it('asks for text on a blank search without calling the server', async () => {
    const fetcher = stubFetch(() => json({ places: [] }));
    mount();
    await find('');
    expect(field()).toHaveAccessibleDescription('Type a city, town or PIN code first. Any place in India.');
    expect(field()).toHaveFocus();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('says why nothing happened when Enter is pressed in the field, where focus does not move', async () => {
    const fetcher = stubFetch(() => json({ places: [] }));
    mount();
    await userEvent.click(field());
    await userEvent.keyboard('{Enter}');
    expect(live()).toHaveTextContent('Type a city, town or PIN code first.');
    expect(field()).toHaveFocus();
    await userEvent.type(field(), 'Xyzzyqtown{Enter}');
    await waitFor(() => {
      expect(live()).toHaveTextContent('No place in India matches “Xyzzyqtown”.');
    });
    expect(field()).toHaveFocus();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('says it is finding places, shows a failed search with a retry, and searches again', async () => {
    const failed = () => json({ error: { code: 'internal', message: 'Failed.', issues: [] } }, 500);
    let answer: () => Response | Promise<Response> = () => new Promise<Response>(() => undefined);
    const fetcher = stubFetch(() => answer());
    mount();
    await userEvent.type(field(), 'Pune');
    await userEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(screen.getByText('Finding places', { selector: 'p.status' })).toBeInTheDocument();
    answer = failed;
    await userEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The server could not do this');
    answer = () => json({ places: [townPlace({ name: 'Pune', label: 'Pune, Maharashtra' })] });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(3);
    });
  });

  it('passes the rounded device point with no place, and shows a refusal', async () => {
    const position = { coords: { latitude: 28.6543, longitude: 77.3149 } };
    interface Refusal {
      code: number;
      PERMISSION_DENIED: number;
    }
    const getCurrentPosition = vi.fn<
      (ok: (at: typeof position) => void, fail: (error: Refusal) => void) => void
    >((ok) => {
      ok(position);
    });
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    const { onChoose } = mount();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(onChoose).toHaveBeenCalledWith(null, { lat: 28.65, lon: 77.31 });
    getCurrentPosition.mockImplementation((_ok, fail) => {
      fail({ code: 1, PERMISSION_DENIED: 1 });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Location is turned off for this site');
  });
});
