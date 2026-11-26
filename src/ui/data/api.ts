// Typed hooks for each API route. Views call these and never write their own fetching.
import { useMemo } from 'react';
import { airRoute, placesRoute } from '../../features/air/contract.js';
import type { AirResponse, Location, PlacesResponse } from '../../features/air/types.js';
import { askRoute } from '../../features/assistant/contract.js';
import type { AskRequest, AskResponse } from '../../features/assistant/types.js';
import { noticeRoute } from '../../features/community/contract.js';
import type { NoticeRequest, NoticeResponse } from '../../features/community/types.js';
import { intakeRoute } from '../../features/household/contract.js';
import type { IntakeRequest, IntakeResponse } from '../../features/household/types.js';
import { planRoute } from '../../features/planner/contract.js';
import type { PlanRequest, PlanResponse } from '../../features/planner/types.js';
import { getJson, postJson } from '../api-client.js';
import { useAction, useQuery } from './request.js';
import type { Action, Call, OnDone, Query } from './request.js';

/** Rounds a coordinate to two decimals, about a kilometre, as the air route requires. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

const placesCall: Call<string, PlacesResponse> = (q, signal) => getJson(placesRoute, { q }, { signal });
const airCall: Call<Location, AirResponse> = (at, signal) =>
  getJson(airRoute, { lat: roundCoordinate(at.lat), lon: roundCoordinate(at.lon) }, { signal });
const intakeCall: Call<IntakeRequest, IntakeResponse> = (body, signal) =>
  postJson(intakeRoute, body, { signal });
const planCall: Call<PlanRequest, PlanResponse> = (body, signal) => postJson(planRoute, body, { signal });
const askCall: Call<AskRequest, AskResponse> = (body, signal) => postJson(askRoute, body, { signal });
const noticeCall: Call<NoticeRequest, NoticeResponse> = (body, signal) =>
  postJson(noticeRoute, body, { signal });

/** Place search for a typed city, town or PIN code. Pass null until the reader asks. */
export function usePlaces(query: string | null): Query<PlacesResponse> {
  return useQuery(placesCall, query);
}

/** The air for a location, asked again only when the rounded location changes. */
export function useAir(location: Location | null, onDone?: OnDone<AirResponse>): Query<AirResponse> {
  const lat = location === null ? null : roundCoordinate(location.lat);
  const lon = location === null ? null : roundCoordinate(location.lon);
  const at = useMemo(() => (lat === null || lon === null ? null : { lat, lon }), [lat, lon]);
  return useQuery(airCall, at, onDone);
}

/** Reads a plain description into a household. run({ text }) from the send button. */
export function useIntake(): Action<IntakeRequest, IntakeResponse> {
  return useAction(intakeCall);
}

/** The day plan. Pass setPlan from useAppActions as onDone to keep it; compare passes nothing. */
export function usePlan(onDone?: OnDone<PlanResponse>): Action<PlanRequest, PlanResponse> {
  return useAction(planCall, onDone);
}

/** A question under the plan. */
export function useAsk(): Action<AskRequest, AskResponse> {
  return useAction(askCall);
}

/** The community facts, actions and notice. */
export function useNotice(): Action<NoticeRequest, NoticeResponse> {
  return useAction(noticeCall);
}
