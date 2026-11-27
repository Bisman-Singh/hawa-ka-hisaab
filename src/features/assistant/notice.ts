// The community notice worded by the model under the guards: the request that asks for a rewording of the rules
// notice, run the way every model task is run, with the community feature's own checks on the reply.
import type { ModelRequest } from '../../lib/model.js';
import { acceptNoticeReply } from '../community/notice.js';
import { noticeReplySchema } from '../community/schemas.js';
import type { CommunityKind, CommunityReport, NoticeReply, NoticeWording } from '../community/types.js';
import { runGuarded, type Guarded, type ModelRun } from './guarded.js';
import { NOTICE_INSTRUCTIONS } from './instructions.js';

const AUDIENCE: Readonly<Record<CommunityKind, string>> = {
  school: 'parents and staff',
  housing_society: 'residents',
};

const textsOf = (wording: NoticeWording): string[] => [
  wording.title,
  ...wording.actions.map((line) => line.text),
];

/** The request that asks the model to reword the rules notice. The fact set is every number it may use. */
export function noticeModelRequest(report: CommunityReport): ModelRequest<NoticeReply> {
  const data = {
    audience: AUDIENCE[report.kind],
    band: report.band,
    opening: { en: report.frame.en.opening, hi: report.frame.hi.opening },
    wording: report.wording,
    reasons: report.actions.map((action) => ({ id: action.id, reason: action.detail })),
  };
  return {
    task: 'notice',
    instructions: NOTICE_INSTRUCTIONS,
    data: JSON.stringify(data),
    facts: report.factSet,
    schema: noticeReplySchema,
    tools: [],
  };
}

/**
 * Words the notice in both languages. The reply may repeat numbers from the fact set and from the rules wording,
 * whose every number is in the fact set. A reply the community checks refuse is retried once with the reason.
 * names are upstream names, such as the station's, whose digits count only as part of the whole name.
 */
export function wordNotice(
  run: ModelRun<NoticeReply>,
  report: CommunityReport,
  names: readonly string[] = [],
): Promise<Guarded<NoticeReply>> {
  return runGuarded(run, {
    request: noticeModelRequest(report),
    sources: () => [...textsOf(report.wording.en), ...textsOf(report.wording.hi)],
    prose: (reply) => [...textsOf(reply.en), ...textsOf(reply.hi)],
    check: (reply) => {
      const accepted = acceptNoticeReply(report, reply);
      return accepted.ok ? null : accepted.error;
    },
    names,
  });
}
