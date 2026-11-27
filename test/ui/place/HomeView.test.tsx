// Tests for the first screen: the start message, a chosen place kept and read, focus on the air card, the
// reading announced, device location, a place saved from an earlier visit, and axe on the whole view.
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { HomeView } from '../../../src/ui/place/HomeView.js';
import { loadState, saveState } from '../../../src/ui/storage.js';
import { axeViolations, renderInApp } from '../helpers.js';
import { airResponse, json, pinPlace, stubFetch, townPlace } from './air-fixtures.js';

const home = () =>
  renderInApp(
    <Announcer>
      <HomeView />
    </Announcer>,
  );

const routes = (url: string): Response =>
  url.startsWith('/api/places') ? json({ places: [pinPlace()] }) : json(airResponse());

const townRoutes = (url: string): Response =>
  url.startsWith('/api/places') ? json({ places: [townPlace()] }) : json(airResponse());

beforeEach(() => {
  window.localStorage.clear();
});

describe('HomeView', () => {
  it('starts with the place field, the start message and the intake, and asks for no air yet', async () => {
    const fetcher = stubFetch(routes);
    const { container } = home();
    expect(screen.getByRole('heading', { level: 1, name: "Today's air for your place" })).toHaveClass('vh');
    expect(screen.getByRole('heading', { name: 'Start with your place' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Who is at home and how does your day go?' }),
    ).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('keeps a chosen place, reads its air at the rounded point, moves focus to the card and announces it', async () => {
    const fetcher = stubFetch(routes);
    home();
    await userEvent.type(screen.getByRole('textbox', { name: 'City, town or PIN code' }), '110092');
    await userEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(await screen.findByText('JNU, Delhi - DPCC')).toBeInTheDocument();
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/air?lat=28.64&lon=77.3');
    expect(screen.getByRole('heading', { level: 2, name: "Today's air" })).toHaveFocus();
    expect(screen.getByText('PIN 110092, East Delhi, Delhi')).toBeInTheDocument();
    expect(screen.getByText(/Approximate centre of the PIN area/)).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector('.vh[role="status"]')).toHaveTextContent('CPCB AQI 246, Poor.');
    });
    expect(loadState(window.localStorage)).toMatchObject({
      place: pinPlace(),
      location: { lat: 28.64, lon: 77.3 },
    });
  });

  it('names a device location as such and says it was rounded', async () => {
    stubFetch(routes);
    const getCurrentPosition = vi.fn(
      (ok: (at: { coords: { latitude: number; longitude: number } }) => void) => {
        ok({ coords: { latitude: 26.912, longitude: 75.787 } });
      },
    );
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    home();
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(
      await screen.findByText('From this device, rounded to about a kilometre before it is used.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('JNU, Delhi - DPCC')).toBeInTheDocument();
    expect(document.querySelector('.meta')).toHaveTextContent('2.1 km from your location.');
    expect(loadState(window.localStorage)).toMatchObject({
      place: null,
      location: { lat: 26.91, lon: 75.79 },
    });
  });

  it('adds no note for a town found by search', async () => {
    stubFetch(townRoutes);
    const { container } = home();
    await userEvent.type(screen.getByRole('textbox', { name: 'City, town or PIN code' }), 'Lucknow');
    await userEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(await screen.findByText('JNU, Delhi - DPCC')).toBeInTheDocument();
    expect(container.querySelector('.place-note')).toBeNull();
    expect(screen.getByText('Lucknow, Uttar Pradesh')).toBeInTheDocument();
  });

  it('reads the air at once for a place kept from an earlier visit', async () => {
    const fetcher = stubFetch(routes);
    saveState(window.localStorage, {
      version: 1,
      household: null,
      location: { lat: 28.64, lon: 77.3 },
      place: pinPlace(),
      language: 'en',
      modelChoice: null,
    });
    home();
    expect(await screen.findByText('JNU, Delhi - DPCC')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
