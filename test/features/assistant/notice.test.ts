// Tests for the notice under the guards: the community request is sent as it is, a reply the community checks
// refuse is retried with its reason, and markup, a third script or a number not sent is refused by the guards.
import { describe, expect, it } from 'vitest';
import { wordNotice } from '../../../src/features/assistant/notice.js';
import { noticeModelRequest } from '../../../src/features/community/notice.js';
import { buildCommunityReport } from '../../../src/features/community/report.js';
import type { NoticeReply } from '../../../src/features/community/types.js';
import { createFakeModel } from '../../support/fake-model.js';
import { testRun } from '../../support/model-run.js';
import { context } from '../community/support.js';

const report = buildCommunityReport(context());

/** The rules wording with each line reworded, numbers and ids kept, and one field changed if asked. */
function reply(change: (wording: NoticeReply) => NoticeReply = (wording) => wording): NoticeReply {
  const reworded: NoticeReply = {
    en: {
      title: `Notice. ${report.wording.en.title}`,
      actions: report.wording.en.actions.map((line) => ({ id: line.id, text: `Please note. ${line.text}` })),
    },
    hi: {
      title: `सूचना। ${report.wording.hi.title}`,
      actions: report.wording.hi.actions.map((line) => ({ id: line.id, text: `कृपया ध्यान दें। ${line.text}` })),
    },
  };
  return change(reworded);
}

const run = (replies: readonly NoticeReply[]) => {
  const model = createFakeModel(replies.map((value) => ({ reply: value })));
  return { model, result: wordNotice(testRun(model), report) };
};

describe('wordNotice', () => {
  it('sends the community request with its fact set and accepts a faithful rewording', async () => {
    const { model, result } = run([reply()]);
    const checked = await result;
    expect(checked.kind).toBe('checked');
    const { deadline, budget, ...sent } = model.requests[0] ?? { deadline: null, budget: null };
    expect(sent).toEqual(noticeModelRequest(report));
    expect(typeof deadline).toBe('number');
    expect(budget?.left()).toBeGreaterThan(0);
    expect(checked.trace.factsSent).toEqual(report.factSet);
  });

  it('retries a reply that drops an action, with the community reason, then serves the fallback', async () => {
    const dropped = reply((wording) => ({
      ...wording,
      hi: { ...wording.hi, actions: wording.hi.actions.slice(1) },
    }));
    const { model, result } = run([dropped]);
    expect(await result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(model.requests[1]?.instructions).toMatch(/keep every action id once, in the same order/);
  });

  it('refuses markup in any field, as every task does', async () => {
    const tagged = reply((wording) => ({ ...wording, en: { ...wording.en, title: '<b>Air notice</b>' } }));
    const { model, result } = run([tagged]);
    expect(await result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(model.requests[1]?.instructions).toMatch(/HTML or other markup/);
    const entity = reply((wording) => ({
      ...wording,
      hi: { ...wording.hi, title: `सूचना &amp; ${wording.hi.title}` },
    }));
    expect(await run([entity]).result).toMatchObject({ reason: 'invalid_reply' });
  });

  it('refuses Hindi lines that are not in Devanagari and a stray letter from a third script', async () => {
    const roman = reply((wording) => ({
      ...wording,
      hi: { ...wording.hi, title: 'Hawa suchna 26 Nov 2026' },
    }));
    const first = run([roman]);
    expect(await first.result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(first.model.requests[1]?.instructions).toMatch(/Hindi text was not in Devanagari/);
    const thai = reply((wording) => ({ ...wording, hi: { ...wording.hi, title: `${wording.hi.title} ต` } }));
    const second = run([thai]);
    await second.result;
    expect(second.model.requests[1]?.instructions).toMatch(/script other than Latin or Devanagari/);
  });

  it('refuses a number that is neither in the fact set nor in the rules wording', async () => {
    const extra = reply((wording) => ({
      ...wording,
      en: { ...wording.en, title: `${wording.en.title}, AQI 500` },
    }));
    const checked = await run([extra]).result;
    expect(checked).toMatchObject({ kind: 'fallback', reason: 'number_check_failed' });
    expect(checked.trace.numberCheck.unmatched).toEqual(['500']);
  });
});
