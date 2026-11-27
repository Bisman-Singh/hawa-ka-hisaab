// Notices made in this browser when the model is off for it: the community report the notice route builds, with
// its fixed English and Hindi wording, on the air this page read.
import type { AirResponse } from '../../features/air/types.js';
import { buildCommunityReport } from '../../features/community/report.js';
import type { CommunityInput, NoticeResponse } from '../../features/community/types.js';
import { LOCAL_TRACE } from '../plan/local.js';

/** The facts, actions and fixed notice for a society or school on this air at this moment. */
export function localNotice(community: CommunityInput, air: AirResponse, now: number): NoticeResponse {
  const { reading, forecast, grap } = air;
  const report = buildCommunityReport({ community, reading, forecast, grap, now });
  return {
    facts: [...report.facts],
    actions: [...report.actions],
    notice: report.notice,
    trace: LOCAL_TRACE,
  };
}
