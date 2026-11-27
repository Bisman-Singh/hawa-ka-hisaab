// The community notice worded by the model under the guards. What a notice is, its request and its own checks
// come from the community feature; this file only runs that request the way every model task is run.
import { acceptNoticeReply, noticeModelRequest } from '../community/notice.js';
import type { CommunityReport, NoticeReply, NoticeWording } from '../community/types.js';
import { runGuarded, type Guarded, type ModelRun } from './guarded.js';

const textsOf = (wording: NoticeWording): string[] => [
  wording.title,
  ...wording.actions.map((line) => line.text),
];

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
