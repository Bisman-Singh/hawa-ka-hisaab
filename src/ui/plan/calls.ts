// The plan, ask and notice calls for screens that need their own request hooks, so a result can be announced
// the moment it arrives. They go through the same API client and route contracts as the shared hooks.
import { askRoute } from '../../features/assistant/contract.js';
import type { AskRequest, AskResponse } from '../../features/assistant/types.js';
import { noticeRoute } from '../../features/community/contract.js';
import type { NoticeRequest, NoticeResponse } from '../../features/community/types.js';
import { planRoute } from '../../features/planner/contract.js';
import type { PlanRequest, PlanResponse } from '../../features/planner/types.js';
import { postJson } from '../api-client.js';
import type { Call } from '../data/request.js';

/** POST /api/plan. */
export const planCall: Call<PlanRequest, PlanResponse> = (body, signal) =>
  postJson(planRoute, body, { signal });

/** POST /api/ask. */
export const askCall: Call<AskRequest, AskResponse> = (body, signal) => postJson(askRoute, body, { signal });

/** POST /api/notice. */
export const noticeCall: Call<NoticeRequest, NoticeResponse> = (body, signal) =>
  postJson(noticeRoute, body, { signal });
