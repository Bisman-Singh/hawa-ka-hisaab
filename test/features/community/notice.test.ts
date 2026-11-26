// Tests for the notice: assembly, plain text for chat, the model request and the checks on a model's wording.
import { describe, expect, it } from 'vitest';
import {
  acceptNoticeReply,
  assembleNotice,
  MAX_NOTICE_CHARS,
  noticeModelRequest,
  noticeToPlainText,
} from '../../../src/features/community/notice.js';
import { buildCommunityReport } from '../../../src/features/community/report.js';
import { noticeReplySchema } from '../../../src/features/community/schemas.js';
import type { NoticeReply } from '../../../src/features/community/types.js';
import { context } from './support.js';

const report = buildCommunityReport(context());

/** A reworded copy of the rules wording: same ids and numbers, different words. */
function reworded(): NoticeReply {
  const reword = (text: string, lang: 'en' | 'hi'): string =>
    lang === 'en' ? `Please note. ${text}` : `कृपया ध्यान दें। ${text}`;
  return {
    en: {
      title: `Notice. ${report.wording.en.title}`,
      actions: report.wording.en.actions.map((line) => ({ id: line.id, text: reword(line.text, 'en') })),
    },
    hi: {
      title: `सूचना। ${report.wording.hi.title}`,
      actions: report.wording.hi.actions.map((line) => ({ id: line.id, text: reword(line.text, 'hi') })),
    },
  };
}

describe('acceptNoticeReply', () => {
  it('accepts wording that keeps every action, its numbers and both languages', () => {
    const result = acceptNoticeReply(report, reworded());
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.en.lines[0]).toBe(report.notice.en.lines[0]);
    expect(result.ok && result.value.en.lines.at(-1)).toBe(report.notice.en.lines.at(-1));
    expect(result.ok && result.value.hi?.lines[1]).toMatch(/^कृपया ध्यान दें।/);
  });

  it('refuses wording that drops, adds or reorders an action in either language', () => {
    const dropped = reworded();
    const missing = { ...dropped, hi: { ...dropped.hi, actions: dropped.hi.actions.slice(1) } };
    expect(acceptNoticeReply(report, missing)).toEqual({ ok: false, error: 'actions_changed' });
    const swapped = reworded();
    const reordered = { ...swapped, en: { ...swapped.en, actions: [...swapped.en.actions].reverse() } };
    expect(acceptNoticeReply(report, reordered)).toEqual({ ok: false, error: 'actions_changed' });
  });

  it('refuses wording that loses a number its action carried', () => {
    const reply = reworded();
    const lines = reply.en.actions.map((line) =>
      line.id === 'windows' ? { ...line, text: 'Keep windows shut except around midday.' } : line,
    );
    expect(acceptNoticeReply(report, { ...reply, en: { ...reply.en, actions: lines } })).toEqual({
      ok: false,
      error: 'numbers_dropped',
    });
  });

  it('refuses a title that loses the date', () => {
    const reply = reworded();
    const undated = { ...reply, hi: { ...reply.hi, title: 'आज की हवा पर सूचना' } };
    expect(acceptNoticeReply(report, undated)).toEqual({ ok: false, error: 'numbers_dropped' });
  });

  it('counts Devanagari digits as the same numbers', () => {
    const reply = reworded();
    const toDevanagari = (text: string): string =>
      text.replace(/\d/g, (digit) => String.fromCharCode(0x0966 + Number(digit)));
    const lines = reply.hi.actions.map((line) => ({ ...line, text: toDevanagari(line.text) }));
    expect(acceptNoticeReply(report, { ...reply, hi: { ...reply.hi, actions: lines } }).ok).toBe(true);
  });

  it('refuses HTML or entities in any field', () => {
    const reply = reworded();
    const tagged = { ...reply, en: { ...reply.en, title: '<b>Air notice</b>' } };
    expect(acceptNoticeReply(report, tagged)).toEqual({ ok: false, error: 'html' });
    const entity = { ...reply, hi: { ...reply.hi, title: 'सूचना &amp; हवा' } };
    expect(acceptNoticeReply(report, entity)).toEqual({ ok: false, error: 'html' });
  });

  it('refuses English text in the Hindi notice and Devanagari in the English one', () => {
    const reply = reworded();
    const english = { ...reply, hi: { ...reply.hi, title: 'Air quality notice' } };
    expect(acceptNoticeReply(report, english)).toEqual({ ok: false, error: 'wrong_script' });
    const mixed = { ...reply, en: { ...reply.en, title: 'सूचना' } };
    expect(acceptNoticeReply(report, mixed)).toEqual({ ok: false, error: 'wrong_script' });
  });

  it('refuses a notice too long for one printed page', () => {
    const reply = reworded();
    const padded = reply.en.actions.map((line) => ({
      ...line,
      text: `${line.text} ${'Stay safe. '.repeat(20)}`,
    }));
    expect(acceptNoticeReply(report, { ...reply, en: { ...reply.en, actions: padded } })).toEqual({
      ok: false,
      error: 'too_long',
    });
  });
});

describe('noticeModelRequest', () => {
  it('asks for the notice task with the fact set, the reply schema and no tools', () => {
    const request = noticeModelRequest(report);
    expect(request).toMatchObject({
      task: 'notice',
      facts: report.factSet,
      schema: noticeReplySchema,
      tools: [],
    });
    expect(request.instructions).toContain('Keep every action id');
    const data: unknown = JSON.parse(request.data);
    expect(data).toMatchObject({ audience: 'parents and staff', wording: report.wording });
  });

  it('describes a society as residents', () => {
    const society = buildCommunityReport(
      context({ community: { ...context().community, kind: 'housing_society', pupils: null, homes: 90 } }),
    );
    expect(JSON.parse(noticeModelRequest(society).data)).toMatchObject({ audience: 'residents' });
  });
});

describe('assembleNotice and noticeToPlainText', () => {
  it('puts the code-written opening and closing around the worded lines', () => {
    const notice = assembleNotice(report.wording, report.frame);
    expect(notice).toEqual(report.notice);
    expect(notice.en.lines).toHaveLength(report.actions.length + 2);
  });

  it('gives chat-ready text with a blank line between paragraphs', () => {
    expect(noticeToPlainText({ title: 'Air today', lines: ['One.', 'Two.'] })).toBe(
      'Air today\n\nOne.\n\nTwo.',
    );
  });

  it('keeps the page limit at three thousand characters', () => {
    expect(MAX_NOTICE_CHARS).toBe(3000);
  });
});
