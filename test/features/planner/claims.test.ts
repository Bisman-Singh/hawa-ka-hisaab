// Adversarial tests for the planner's headline claims, run over every sample household at every band.
import { describe, expect, it } from 'vitest';
import { FACT_LIST, findFact } from '../../../src/config/facts/index.js';
import { SAMPLE_HOUSEHOLDS } from '../../../src/features/household/samples.js';
import type { Household } from '../../../src/features/household/types.js';
import { travelCo2 } from '../../../src/features/ledger/co2.js';
import type { Effect } from '../../../src/features/ledger/types.js';
import { aqiBandSchema } from '../../../src/features/naqi/schemas.js';
import type { AqiBand } from '../../../src/features/naqi/types.js';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { comparePlans } from '../../../src/features/planner/compare.js';
import { RESTRICTING_KINDS } from '../../../src/features/planner/day-kind.js';
import { buildFactSet } from '../../../src/features/planner/fact-set.js';
import { rulesPlan } from '../../../src/features/planner/rules-plan.js';
import { planSchema } from '../../../src/features/planner/schemas.js';
import type { AirBasis, Plan } from '../../../src/features/planner/types.js';
import { hourCurve } from '../../support/fake-air.js';
import { planTexts, winterDay } from '../../support/plan-fixtures.js';

const BANDS: readonly (AqiBand | null)[] = [...aqiBandSchema.options, null];
const MILD: readonly AqiBand[] = ['good', 'satisfactory'];
const BASIS: AirBasis = { path: 'station', band: 'very_poor', readingHour: null, forecastIssuedAt: null };

function build(household: Household, band: AqiBand | null) {
  const ctx = { household, band, curve: hourCurve(winterDay()), date: '2026-11-24', notBefore: null };
  const set = buildCandidates(ctx);
  return { ctx, set, plan: rulesPlan(ctx, set) };
}

function everyPlan() {
  return SAMPLE_HOUSEHOLDS.flatMap((sample) =>
    BANDS.map((band) => ({ sample, band, ...build(sample.household, band) })),
  );
}

function effectsOf(plan: Plan): Effect[] {
  const items = [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening];
  return [
    ...items.flatMap((item) => item.effects),
    ...plan.alternatives.flatMap((alternative) => (alternative.effect ? [alternative.effect] : [])),
  ];
}

function citedIds(plan: Plan): string[] {
  const items = [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening];
  return [
    ...items.flatMap((item) => [...item.factIds, ...item.whatIfs.flatMap((toggle) => toggle.factIds)]),
    ...plan.indoor.flatMap((step) => [...step.factIds, ...(step.figure?.working.factIds ?? [])]),
    ...plan.alternatives.flatMap((alternative) => alternative.factIds),
    ...effectsOf(plan).flatMap((effect) => effect.working.factIds),
  ];
}

const NUMERAL = /(?<![\p{L}\d.])\d+(?:\.\d+)?/gu;

describe('two households in the same air', () => {
  it('get different plans, and the differences are named', () => {
    for (const [index, left] of SAMPLE_HOUSEHOLDS.entries()) {
      for (const right of SAMPLE_HOUSEHOLDS.slice(index + 1)) {
        const a = build(left.household, 'very_poor').plan;
        const b = build(right.household, 'very_poor').plan;
        expect(JSON.stringify(a.slots)).not.toBe(JSON.stringify(b.slots));
        const result = comparePlans(
          { household: left.household, plan: a, airBasis: BASIS },
          { household: right.household, plan: b, airBasis: BASIS },
        );
        expect(result.ok && result.value.length > 0).toBe(true);
      }
    }
  });
});

describe('a mild day', () => {
  it('carries no restricting item and says most things are fine', () => {
    for (const sample of SAMPLE_HOUSEHOLDS) {
      for (const band of MILD) {
        const { plan } = build(sample.household, band);
        const items = [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening];
        expect(items.filter((item) => RESTRICTING_KINDS.has(item.kind))).toEqual([]);
        expect(plan.headline).toMatch(/most things are fine/i);
      }
    }
  });
});

function inputsOf(plan: Plan) {
  const figures = plan.indoor.flatMap((step) => (step.figure ? [step.figure] : []));
  return [...effectsOf(plan), ...figures].flatMap((found) => found.working.inputs);
}

const safe = (id: string): string => id.replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');

/** Each piece of plan text with the ids whose fact values may account for its numbers. */
function tracedTexts(plan: Plan): { text: string; ids: string[] }[] {
  const items = [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening];
  return [
    { text: plan.headline, ids: [] },
    ...items.map((item) => ({
      text: [item.title, item.why, item.tradeOff ?? '', ...item.whatIfs.map((toggle) => toggle.label)].join(
        ' ',
      ),
      ids: [item.candidateId, ...item.factIds, ...item.whatIfs.map((toggle) => toggle.id)],
    })),
    ...plan.indoor.map((step) => ({ text: `${step.title} ${step.detail}`, ids: [step.id, ...step.factIds] })),
    ...plan.alternatives.map((alt) => ({
      text: `${alt.instead} ${alt.doThis} ${alt.reason}`,
      ids: [alt.id, ...alt.factIds],
    })),
  ];
}

describe('every number in every plan', () => {
  it('cites only facts that exist, and every factor input equals its fact', () => {
    for (const { plan } of everyPlan()) {
      expect(citedIds(plan).filter((id) => findFact(id) === null)).toEqual([]);
      for (const input of inputsOf(plan)) {
        const fact = input.factId === null ? null : findFact(input.factId);
        if (input.from === 'fact') {
          expect(fact?.kind === 'number' && [fact.value, fact.range?.high].includes(input.value)).toBe(true);
        }
      }
    }
  });

  it('is in the fact set sent to the model, under the id of the item or a fact it cites', () => {
    for (const { ctx, set, plan } of everyPlan()) {
      const facts = buildFactSet(ctx, set);
      for (const { text, ids } of tracedTexts(plan)) {
        const allowed = new Set(
          facts.filter((fact) => ids.map(safe).includes(fact.id)).map((fact) => fact.value),
        );
        const numerals = [...text.matchAll(NUMERAL)].map(([raw]) => Number(raw));
        expect({ text, missing: numerals.filter((value) => !allowed.has(value)) }).toEqual({
          text,
          missing: [],
        });
      }
    }
  });
});

describe('numbers we do not show', () => {
  it('never appear as an effect, a fact or plan text', () => {
    for (const { plan } of everyPlan()) {
      expect(effectsOf(plan).every((effect) => ['exposure', 'co2'].includes(effect.kind))).toBe(true);
      const text = planTexts(plan).join('\n');
      expect(text).not.toMatch(/PM added|indoor[- ]to[- ]outdoor|microgram dose|dose of \d/i);
    }
    const banned = FACT_LIST.filter(
      (fact) =>
        fact.kind === 'number' &&
        /metro|electric|indoor.*outdoor|dose/i.test(`${fact.id} ${fact.title}`) &&
        /CO2|ratio|µg|ug/i.test(fact.unit),
    );
    expect(banned).toEqual([]);
  });

  it('gives no CO2 figure for metro or electric travel', () => {
    expect(
      travelCo2({ mode: 'metro', fuel: null, distanceKm: 10, occupancy: 1, roundTrip: true }),
    ).toBeNull();
    expect(
      travelCo2({ mode: 'car', fuel: 'electric', distanceKm: 10, occupancy: 1, roundTrip: true }),
    ).toBeNull();
  });
});

describe('an unknown distance or occupancy', () => {
  it('gives no CO2 figure rather than a guess', () => {
    expect(
      travelCo2({ mode: 'car', fuel: 'petrol', distanceKm: null, occupancy: 1, roundTrip: true }),
    ).toBeNull();
    expect(
      travelCo2({ mode: 'car', fuel: 'petrol', distanceKm: 12, occupancy: null, roundTrip: true }),
    ).toBeNull();
    for (const sample of SAMPLE_HOUSEHOLDS) {
      const household: Household = {
        ...sample.household,
        activities: sample.household.activities.map((activity) => ({
          ...activity,
          travel: activity.travel && { ...activity.travel, distanceKm: null },
        })),
      };
      for (const band of BANDS) {
        expect(effectsOf(build(household, band).plan).filter((effect) => effect.kind === 'co2')).toEqual([]);
      }
    }
  });
});

describe('exposure changes', () => {
  it('never fall below minus one, a cut of all of it', () => {
    const lows = everyPlan().flatMap(({ plan }) =>
      effectsOf(plan).flatMap((effect) => (effect.kind === 'exposure' ? [effect.change.low] : [])),
    );
    expect(lows.length).toBeGreaterThan(0);
    expect(lows.every((low) => low >= -1)).toBe(true);
  });
});

describe('the rules plan', () => {
  it('is valid against the plan schema for every sample at every band and for an unknown band', () => {
    for (const { sample, band, plan } of everyPlan()) {
      const result = planSchema.safeParse(plan);
      expect({ sample: sample.id, band, issues: result.error?.issues ?? [] }).toEqual({
        sample: sample.id,
        band,
        issues: [],
      });
    }
  });
});
