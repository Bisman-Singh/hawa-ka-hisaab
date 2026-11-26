// Tests for plan wording: ids from the candidates sent, every number from the facts, one retry, then the rules path.
import { describe, expect, it } from 'vitest';
import { wordPlan, type PlanWordingInput } from '../../../src/features/assistant/word-plan.js';
import type { CandidateAction, PlanWording } from '../../../src/features/planner/types.js';
import { createFakeModel } from '../../support/fake-model.js';
import { LIMITED, testRun } from '../../support/model-run.js';
import { sampleExposureEffect, sampleHousehold } from '../../support/samples.js';

function candidate(id: string, start: string | null = '16:00'): CandidateAction {
  return {
    id,
    kind: 'reschedule',
    slot: 'afternoon',
    activityId: 'a2',
    memberIds: ['m3'],
    start,
    effects: [sampleExposureEffect()],
    factIds: ['test-factor'],
    template: { title: 'Move football earlier', why: 'The air is cleaner at 16:00.', tradeOff: null },
    whatIfs: [],
  };
}

function input(): PlanWordingInput {
  return {
    candidates: [candidate('move-a2'), candidate('mask-a1', null)],
    facts: [
      { id: 'air-aqi', label: 'CPCB AQI', value: 246, unit: 'AQI' },
      { id: 'move-a2', label: 'Shown figure for move-a2', value: 30, unit: '' },
      { id: 'move-a2', label: 'Shown figure for move-a2', value: 60, unit: '' },
    ],
    times: ['16:00'],
    household: sampleHousehold(),
    dayKind: 'moderate',
    language: 'en',
    air: {
      path: 'station',
      band: 'poor',
      aqi: 246,
      station: 'JNU, Delhi',
      distanceKm: 3.2,
      time: '22:00',
      stale: false,
    },
  };
}

function wording(why: string, candidateId = 'move-a2'): PlanWording {
  return {
    headline: 'A poor air day.',
    items: [{ candidateId, title: 'Play earlier', why, tradeOff: null }],
  };
}

describe('wordPlan', () => {
  it('returns checked wording when every number and time was sent', async () => {
    const model = createFakeModel([
      { reply: wording('AQI is 246, so play at 16:00 to cut exposure 30 to 60%.') },
    ]);
    const result = await wordPlan(testRun(model), input());
    expect(result.kind).toBe('checked');
    expect(result.trace).toMatchObject({
      producedBy: 'model',
      modelId: 'fake-model',
      fallbackReason: null,
      numberCheck: { status: 'passed', attempts: 1, unmatched: [] },
    });
    expect(result.trace.factsSent).toEqual(input().facts);
    expect(model.requests[0]?.task).toBe('plan');
  });

  it('rejects an invented number, retries once, then falls back with the misses in the trace', async () => {
    const model = createFakeModel([{ reply: wording('The AQI is 999 today.') }]);
    const result = await wordPlan(testRun(model), input());
    expect(model.requests).toHaveLength(2);
    expect(model.requests[1]?.instructions).toMatch(/previous reply was rejected/);
    expect(result).toMatchObject({ kind: 'fallback', reason: 'number_check_failed' });
    expect(result.trace).toMatchObject({
      producedBy: 'rules',
      modelId: 'fake-model',
      fallbackReason: 'number_check_failed',
      numberCheck: { status: 'failed', attempts: 2, unmatched: ['999'] },
    });
    expect(result.trace.modelReply).toContain('999');
  });

  it('rejects a Devanagari numeral that was not sent', async () => {
    const model = createFakeModel([{ reply: wording('आज एक्यूआई ४५० है।') }]);
    const result = await wordPlan(testRun(model), input());
    expect(result).toMatchObject({ kind: 'fallback', reason: 'number_check_failed' });
    expect(result.trace.numberCheck.unmatched).toEqual(['450']);
  });

  it('checks the trade-off text too', async () => {
    const tradeOff = (text: string): PlanWording => ({
      headline: 'Today.',
      items: [{ candidateId: 'move-a2', title: 'Play earlier', why: 'Cleaner air.', tradeOff: text }],
    });
    const good = createFakeModel([{ reply: tradeOff('Earlier play means leaving work at 16:00.') }]);
    expect((await wordPlan(testRun(good), input())).kind).toBe('checked');
    const bad = createFakeModel([{ reply: tradeOff('It costs 75 minutes.') }]);
    expect((await wordPlan(testRun(bad), input())).trace.numberCheck.unmatched).toEqual(['75']);
  });

  it('accepts the second reply when the retry fixes the number', async () => {
    const model = createFakeModel([{ reply: wording('AQI 300.') }, { reply: wording('AQI 246.') }]);
    const result = await wordPlan(testRun(model), input());
    expect(result.kind).toBe('checked');
    expect(result.trace.numberCheck).toEqual({ status: 'passed', attempts: 2, unmatched: [] });
  });

  it('rejects a candidate id that was not sent', async () => {
    const model = createFakeModel([{ reply: wording('Play earlier.', 'cancel-everything') }]);
    const result = await wordPlan(testRun(model), input());
    expect(result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(model.requests[1]?.instructions).toMatch(/candidate that was not sent/);
  });

  it('never lets markup through as wording', async () => {
    const model = createFakeModel([{ reply: wording('<img src=x onerror=alert(1)> close the windows') }]);
    const result = await wordPlan(testRun(model), input());
    expect(result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(result.kind === 'checked' ? result.value : null).toBeNull();
  });

  it('answers on the rules path without calling the model when the client is over its limit', async () => {
    const model = createFakeModel([{ reply: wording('AQI 246.') }]);
    const result = await wordPlan(testRun(model, { decision: LIMITED }), input());
    expect(model.requests).toHaveLength(0);
    expect(result).toMatchObject({ kind: 'fallback', reason: 'rate_limited' });
    expect(result.trace).toMatchObject({ producedBy: 'rules', modelId: null, numberCheck: { attempts: 0 } });
  });

  it('falls back with the failure kind and does not retry when the model is over quota', async () => {
    const model = createFakeModel([{ failure: 'quota' }]);
    const result = await wordPlan(testRun(model), input());
    expect(model.requests).toHaveLength(1);
    expect(result).toMatchObject({ kind: 'fallback', reason: 'quota' });
  });

  it('sends the candidates and household as data, never inside the instructions', async () => {
    const model = createFakeModel([{ reply: wording('AQI 246.') }]);
    await wordPlan(testRun(model), input());
    const request = model.requests[0];
    expect(request?.data).toContain('move-a2');
    expect(request?.data).toContain('football');
    expect(request?.instructions).not.toContain('football');
    expect(request?.tools).toEqual([]);
  });

  it('allows the times the candidates and the air show, but not a raw computed value or a household number', async () => {
    const times = createFakeModel([{ reply: wording('The 22:00 reading gave 246; move to 16:00.') }]);
    expect((await wordPlan(testRun(times), input())).kind).toBe('checked');
    const raw = createFakeModel([{ reply: wording('This cuts 45 percent, over 14 km.') }]);
    expect((await wordPlan(testRun(raw), input())).trace.numberCheck.unmatched).toEqual(['45%', '14']);
  });

  it('refuses two main actions for the same activity, such as keep with care and move, and says why', async () => {
    const both = createFakeModel([
      {
        reply: {
          headline: 'Today.',
          items: [
            { candidateId: 'move-a2', title: 'Move it', why: 'Cleaner at 16:00.', tradeOff: null },
            { candidateId: 'mask-a1', title: 'Mask', why: 'Wear one.', tradeOff: null },
          ],
        },
      },
    ]);
    const result = await wordPlan(testRun(both), input());
    expect(result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(both.requests[1]?.instructions).toMatch(/two actions for the same activity/);
  });
});
