// Typed hooks for the routes the first screen uses: place search, the air and the household intake.
// Views call these and never write their own fetching; the plan, ask and notice hooks sit in plan-api.ts.
import { useMemo } from 'react';
import { airRoute, placesRoute } from '../../features/air/contract.js';
import type { AirResponse, Location, PlacesResponse } from '../../features/air/types.js';
import { intakeRoute } from '../../features/household/contract.js';
import type { IntakeRequest, IntakeResponse } from '../../features/household/types.js';
import { getJson, postJson } from '../api-client.js';
import { type Action, type Call, type OnDone, type Query, useAction, useQuery } from './request.js';

/** Rounds a coordinate to two decimals, about a kilometre, as the air route requires. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

/** One place search as submitted. turn makes a repeated search of the same text run again. */
export interface PlaceQuery {
  readonly q: string;
  readonly turn: number;
}

const placesCall: Call<PlaceQuery, PlacesResponse> = (search, signal) =>
  getJson(placesRoute, { q: search.q }, { signal });
const airCall: Call<Location, AirResponse> = (at, signal) =>
  getJson(airRoute, { lat: roundCoordinate(at.lat), lon: roundCoordinate(at.lon) }, { signal });
const intakeCall: Call<IntakeRequest, IntakeResponse> = (body, signal) =>
  postJson(intakeRoute, body, { signal });

/** Place search for a typed city, town or PIN code. Pass null until the reader asks. */
export function usePlaces(search: PlaceQuery | null, onDone?: OnDone<PlacesResponse>): Query<PlacesResponse> {
  return useQuery(placesCall, search, onDone);
}

/** The air for a location, asked again only when the rounded location changes. */
export function useAir(location: Location | null, onDone?: OnDone<AirResponse>): Query<AirResponse> {
  const lat = location === null ? null : roundCoordinate(location.lat);
  const lon = location === null ? null : roundCoordinate(location.lon);
  const at = useMemo(() => (lat === null || lon === null ? null : { lat, lon }), [lat, lon]);
  return useQuery(airCall, at, onDone);
}

/** Reads a plain description into a household. run({ text }) from the send button; onDone gets the answer. */
export function useIntake(onDone?: OnDone<IntakeResponse>): Action<IntakeRequest, IntakeResponse> {
  return useAction(intakeCall, onDone);
}
