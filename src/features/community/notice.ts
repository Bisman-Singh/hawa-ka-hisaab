// The notice as served: code-written opening and closing lines around the worded lines, plain text for a chat
// app, and the checks a model's wording must pass before it replaces the rules.
import { err, ok, type Result } from '../../lib/result.js';
import type { Language } from '../../lib/types.js';
import { numeralsIn, pairs } from './format.js';
import { noticeTextSchema } from './schemas.js';
import type {
  CommunityReport,
  Notice,
  NoticeFrame,
  NoticeReply,
  NoticeText,
  NoticeWording,
} from './types.js';

/** Most characters a notice may hold in one language, title included, so it fits one printed page. */
export const MAX_NOTICE_CHARS = 3000;

/**
 * Why a model's wording was refused. The caller then serves the rules notice. Markup, hidden characters and numbers
 * that were not sent are refused by the guards every model task runs under.
 */
export type NoticeReplyProblem = 'actions_changed' | 'wrong_script' | 'numbers_dropped' | 'too_long';

const LANGUAGES: readonly Language[] = ['en', 'hi'];
const DEVANAGARI = /[ऀ-ॿ]/;
type Frames = Readonly<Record<Language, NoticeFrame>>;

function noticeText(wording: NoticeReply, frame: Frames, lang: Language): NoticeText {
  return {
    title: wording[lang].title,
    lines: [frame[lang].opening, ...wording[lang].actions.map((line) => line.text), frame[lang].closing],
  };
}

/** The served notice: in each language the title, the opening, one line per action and the closing. */
export function assembleNotice(wording: NoticeReply, frame: Frames): Notice {
  return { en: noticeText(wording, frame, 'en'), hi: noticeText(wording, frame, 'hi') };
}

/** Notice text ready to paste into a chat app: the title and each line as its own paragraph. */
export function noticeToPlainText(text: NoticeText): string {
  return [text.title, ...text.lines].join('\n\n');
}

const textsOf = (wording: NoticeWording): string[] => [
  wording.title,
  ...wording.actions.map((line) => line.text),
];

const idsOf = (wording: NoticeWording): string => wording.actions.map((line) => line.id).join(' ');

function numbersKept(report: CommunityReport, reply: NoticeReply): boolean {
  return LANGUAGES.every((lang) =>
    pairs(textsOf(report.wording[lang]), textsOf(reply[lang])).every(([rules, worded]) => {
      const kept = new Set(numeralsIn(worded));
      return numeralsIn(rules).every((value) => kept.has(value));
    }),
  );
}

function fitsPage(text: NoticeText): boolean {
  const chars = text.title.length + text.lines.join('').length;
  return chars <= MAX_NOTICE_CHARS && noticeTextSchema.safeParse(text).success;
}

function problemOf(report: CommunityReport, reply: NoticeReply): NoticeReplyProblem | null {
  const scriptsRight =
    textsOf(reply.en).every((text) => !DEVANAGARI.test(text)) &&
    textsOf(reply.hi).every((text) => DEVANAGARI.test(text));
  const checks: readonly [NoticeReplyProblem, boolean][] = [
    ['actions_changed', LANGUAGES.every((lang) => idsOf(reply[lang]) === idsOf(report.wording.en))],
    ['wrong_script', scriptsRight],
    ['numbers_dropped', numbersKept(report, reply)],
    ['too_long', LANGUAGES.every((lang) => fitsPage(noticeText(reply, report.frame, lang)))],
  ];
  return checks.find(([, passed]) => !passed)?.[0] ?? null;
}

/**
 * Accepts a model's wording only when every action is still there in both languages and in order, the title and
 * each line keep the numbers their rules text had, English has no Devanagari and every Hindi field has some, and
 * the notice fits a page. The guards for markup and for numbers against the fact set run separately.
 */
export function acceptNoticeReply(
  report: CommunityReport,
  reply: NoticeReply,
): Result<Notice, NoticeReplyProblem> {
  const problem = problemOf(report, reply);
  return problem === null ? ok(assembleNotice(reply, report.frame)) : err(problem);
}
