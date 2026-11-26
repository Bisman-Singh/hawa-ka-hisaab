// Tests for what the place field shows under itself and the words for its hint and problem.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlacesResponse } from '../../../src/features/air/types.js';
import type { Query, RequestState } from '../../../src/ui/data/request.js';
import { Crosshair, DeviceState, fieldWords, SearchState } from '../../../src/ui/place/place-states.js';
import { pinPlace, townPlace } from './air-fixtures.js';

const query = (state: RequestState<PlacesResponse>): Query<PlacesResponse> => ({ state, retry: vi.fn() });
const found = (places: PlacesResponse['places']) => query({ status: 'done', data: { places } });

describe('SearchState', () => {
  it('shows nothing before a search and after a single match, and a list for several', () => {
    const { container, rerender } = render(
      <SearchState query={query({ status: 'idle' })} id="p" pick={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<SearchState query={found([townPlace()])} id="p" pick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SearchState query={found([townPlace(), pinPlace()])} id="p" pick={vi.fn()} />);
    expect(screen.getByRole('list', { name: 'Which place do you mean?' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.id)).toEqual(['p-first', '']);
  });
});

describe('DeviceState', () => {
  it('shows nothing when idle, a status while asking and an alert for each refusal', () => {
    const { container, rerender } = render(<DeviceState state="idle" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<DeviceState state="asking" />);
    expect(screen.getByText('Asking the browser for your location')).toBeInTheDocument();
    rerender(<DeviceState state="outside" />);
    expect(screen.getByRole('alert')).toHaveTextContent('This location is outside India');
    rerender(<DeviceState state="unavailable" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your location could not be found');
  });
});

describe('fieldWords', () => {
  it('asks for text on a blank search, names a place not found, and otherwise gives the plain hint', () => {
    const search = { q: 'Lukhnow', turn: 1 };
    expect(fieldWords(true, null, query({ status: 'idle' }))).toEqual({
      error: 'Type a city, town or PIN code first.',
      hint: 'Any place in India.',
    });
    expect(fieldWords(false, search, found([]))).toEqual({
      error: 'No place in India matches “Lukhnow”.',
      hint: 'Check the spelling, or try a PIN code.',
    });
    expect(fieldWords(false, search, found([townPlace()]))).toEqual({
      error: undefined,
      hint: 'Any place in India.',
    });
    expect(fieldWords(false, search, query({ status: 'loading' }))).toEqual({
      error: undefined,
      hint: 'Any place in India.',
    });
  });

  it('draws the crosshair hidden from assistive technology', () => {
    const { container } = render(<Crosshair />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
