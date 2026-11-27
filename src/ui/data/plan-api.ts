// Typed hooks for the plan, ask and notice routes. They sit apart from api.ts so only the views that load on demand
// carry these route schemas; the first screen never needs them.
import { askRoute } from '../../features/assistant/contract.js';
import type { AskRequest, AskResponse } from '../../features/assistant/types.js';
import { noticeRoute } from '../../features/community/contract.js';
import type { NoticeRequest, NoticeResponse } from '../../features/community/types.js';
import { planRoute } from '../../features/planner/contract.js';
import type { PlanRequest, PlanResponse } from '../../features/planner/types.js';
import { postJson } from '../api-client.js';
import { type Action, type Call, type OnDone, type Query, useAction, useQuery } from './request.js';

const planCall: Call<PlanRequest, PlanResponse> = (body, signal) => postJson(planRoute, body, { signal });
const askCall: Call<AskRequest, AskResponse> = (body, signal) => postJson(askRoute, body, { signal });
const noticeCall: Call<NoticeRequest, NoticeResponse> = (body, signal) =>
  postJson(noticeRoute, body, { signal });

/** The day plan for a request, asked whenever the request changes and not while it is null. */
export function usePlanFor(request: PlanRequest | null, onDone?: OnDone<PlanResponse>): Query<PlanResponse> {
  return useQuery(planCall, request, onDone);
}

/** A plan made on demand, as compare does for two households. onDone gets the answer. */
export function usePlan(onDone?: OnDone<PlanResponse>): Action<PlanRequest, PlanResponse> {
  return useAction(planCall, onDone);
}

/** A question under the plan. onDone gets the answer, for example to announce it. */
export function useAsk(onDone?: OnDone<AskResponse>): Action<AskRequest, AskResponse> {
  return useAction(askCall, onDone);
}

/** The community facts, actions and notice. onDone gets the answer. */
export function useNotice(onDone?: OnDone<NoticeResponse>): Action<NoticeRequest, NoticeResponse> {
  return useAction(noticeCall, onDone);
}
