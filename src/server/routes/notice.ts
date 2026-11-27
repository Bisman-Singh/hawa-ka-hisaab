// POST /api/notice: facts, actions and a notice in English and Hindi for a housing society or school. Code builds
// the report and the rules notice; the model may only reword it under the guards and the notice's own checks.
import { airFacts } from '../../features/air/reading-facts.js';
import { readAir } from '../../features/air/service.js';
import { stationNames } from '../../features/assistant/plan-view.js';
import { wordNotice } from '../../features/assistant/notice.js';
import { noticeRoute } from '../../features/community/contract.js';
import { assembleNotice } from '../../features/community/notice.js';
import { buildCommunityReport } from '../../features/community/report.js';
import type { NoticeReply } from '../../features/community/types.js';
import { ok } from '../../lib/result.js';
import type { RouteModule } from '../deps.js';
import { createModelRoute, logFallback, runFor } from '../model-route.js';
import { mountPost } from '../mount.js';

/** Registers the notice route. Whenever the model path is unavailable the rules notice is served, labelled. */
export const registerNotice: RouteModule = (target) => {
  const { deps } = target;
  const route = createModelRoute<NoticeReply>(deps, noticeRoute.path);
  mountPost(target, noticeRoute, async (body, meta) => {
    const started = deps.clock.now();
    const air = await readAir(deps.air, deps.clock, body.location);
    const report = buildCommunityReport({ community: body.community, ...air, now: started });
    const names = stationNames(airFacts(air.reading).summary);
    const worded = await wordNotice(runFor(route, meta, started), report, names);
    logFallback(route, worded.kind === 'fallback' ? worded.reason : null);
    const notice = worded.kind === 'checked' ? assembleNotice(worded.value, report.frame) : report.notice;
    return ok({ facts: [...report.facts], actions: [...report.actions], notice, trace: worded.trace });
  });
};
