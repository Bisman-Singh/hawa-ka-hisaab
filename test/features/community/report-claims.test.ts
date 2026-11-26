// Headline claims swept over every reading, kind and GRAP case: no derived mass figures, every number traced,
// mild days unrestricted, GRAP only in Delhi NCR, the same actions in Hindi, and each notice to its own readers.
import { describe, expect, it } from 'vitest';
import { FACT_LIST } from '../../../src/config/facts/index.js';
import { noticeResponseSchema } from '../../../src/features/community/contract.js';
import { buildCommunityReport } from '../../../src/features/community/report.js';
import type { CommunityContext, CommunityReport } from '../../../src/features/community/types.js';
import { sampleTrace } from '../../support/samples.js';
import { AQI_BY_BAND, allContexts } from './support.js';

const EM_DASH = String.fromCharCode(0x2014);

const RESTRICTING = [
  'assembly-indoors',
  'outdoor-indoors',
  'outdoor-move',
  'outdoor-light',
  'windows',
  'wet-mopping',
  'masks',
  'outdoor-staff',
  'no-idling',
  'generator-essential',
  'grap-sports',
];

function englishText(report: CommunityReport): string[] {
  return [
    ...report.facts.flatMap((fact) => [
      fact.label,
      fact.unit,
      fact.working.formula,
      ...fact.working.inputs.flatMap((input) => [input.label, input.unit]),
    ]),
    ...report.actions.flatMap((action) => [action.title, action.detail]),
    report.notice.en.title,
    ...report.notice.en.lines,
  ];
}

function hindiText(report: CommunityReport): string[] {
  return report.notice.hi === null ? [] : [report.notice.hi.title, ...report.notice.hi.lines];
}

const allText = (report: CommunityReport): string[] => [...englishText(report), ...hindiText(report)];

function numeralsIn(text: string): number[] {
  const digits = text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966));
  return [...digits.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
}

function structuredNumbers(report: CommunityReport): number[] {
  return report.facts.flatMap((fact) => [fact.value, ...fact.working.inputs.map((input) => input.value)]);
}

const clockParts = (clock: string): number[] => [Number(clock.slice(0, 2)), Number(clock.slice(3))];

function inputNumbers({ community }: CommunityContext): number[] {
  const times = [community.assembly, ...community.outdoorPeriods.map((period) => period.start)];
  const counts = [community.pupils, community.children, community.olderAdults, community.outdoorStaff];
  const gate = community.gateIdling;
  return [
    ...counts,
    community.homes,
    community.generator?.hoursPerDay,
    gate?.vehiclesPerDay,
    gate?.idleMinutes,
    community.outdoorPeriods.length,
    ...times.flatMap((time) => (time === null ? [] : clockParts(time))),
  ].filter((value) => typeof value === 'number');
}

function computedNumbers({ community }: CommunityContext): number[] {
  const counts = [community.pupils, community.children, community.olderAdults, community.outdoorStaff];
  const gate = community.gateIdling;
  const periods = Array.from({ length: community.outdoorPeriods.length + 1 }, (_, count) => count);
  return [
    counts.reduce<number>((sum, value) => sum + (value ?? 0), 0),
    gate === null ? 0 : Math.round(gate.vehiclesPerDay * gate.idleMinutes * 10) / 10,
    ...periods,
  ];
}

const FACT_NUMBERS = new Map<string, readonly (number | undefined)[]>();
for (const fact of FACT_LIST) {
  if (fact.kind === 'number') {
    FACT_NUMBERS.set(fact.id, [fact.value, fact.range?.low, fact.range?.high]);
  }
}

function allowedFor(id: string, ctx: CommunityContext): readonly (number | undefined)[] {
  const byFamily: Record<string, readonly number[]> = {
    input: inputNumbers(ctx),
    computed: computedNumbers(ctx),
    air: [...Object.values(AQI_BY_BAND), 5, 6, 0, 62],
    forecast: [13, 16, 0],
    notice: [26, 2026],
  };
  if (id === ctx.grap?.factId) {
    return [17, 2026];
  }
  return FACT_NUMBERS.get(id) ?? byFamily[id.split('-')[0] ?? ''] ?? [];
}

describe('community report, headline claims', () => {
  const cases = allContexts().map((ctx) => ({ ctx, report: buildCommunityReport(ctx) }));

  it('never shows a mass, concentration or emission figure', () => {
    const massUnit =
      /µg|μg|ug\/m|mg\/m|\bmg\b|\bkg\b|\bgrams?\b|\btonnes?\b|\btons?\b|ppm|ppb|m³|\bm3\b|microgram|माइक्रोग्राम|किलो|ग्राम|टन/i;
    const numberWithMass = /\d\s*(g|kg|mg|t|µg|μg)\b/;
    const units = new Set(['people', 'hours a day', 'vehicle-minutes a day', 'outdoor periods']);
    for (const { report } of cases) {
      expect(allText(report).filter((text) => massUnit.test(text) || numberWithMass.test(text))).toEqual([]);
      expect(report.facts.filter((fact) => !units.has(fact.unit))).toEqual([]);
    }
  });

  it('shows only numbers from the fact set, and every fact set number traces to an input or a fact', () => {
    for (const { ctx, report } of cases) {
      const allowed = new Set(report.factSet.map((fact) => fact.value));
      const shown = [...allText(report).flatMap(numeralsIn), ...structuredNumbers(report)];
      expect(shown.filter((value) => !allowed.has(value))).toEqual([]);
      const untraced = report.factSet.filter((fact) => !allowedFor(fact.id, ctx).includes(fact.value));
      expect(untraced).toEqual([]);
    }
  });

  it('cites only facts that exist', () => {
    const known = new Set(FACT_LIST.map((fact) => fact.id));
    for (const { report } of cases) {
      const cited = [
        ...report.actions.flatMap((action) => action.factIds),
        ...report.facts.flatMap((fact) => fact.working.factIds),
      ];
      expect(cited.filter((id) => !known.has(id))).toEqual([]);
    }
  });

  it('puts no restriction on a mild day and says normal activity is fine', () => {
    const mild = cases.filter(({ report }) => report.dayKind === 'mild');
    expect(mild.length).toBe(24);
    for (const { report } of mild) {
      expect(report.actions.map((action) => action.id).filter((id) => RESTRICTING.includes(id))).toEqual([]);
      expect(report.actions.map((action) => action.id)).toContain('normal-day');
      const ours = (lang: 'en' | 'hi'): string[] =>
        report.wording[lang].actions.filter((line) => line.id !== 'grap-stage').map((line) => line.text);
      expect(ours('en').filter((line) => /indoors|shut|mask|N95|engine/i.test(line))).toEqual([]);
      expect(ours('hi').filter((line) => /अंदर|मास्क|बंद रखें|इंजन/.test(line))).toEqual([]);
      expect(report.notice.en.lines[0]).not.toMatch(/indoors|mask/i);
    }
  });

  it('shows GRAP content only for places in Delhi NCR', () => {
    for (const { ctx, report } of cases.filter((item) => item.ctx.grap === null)) {
      expect(allText(report).filter((text) => /GRAP|CAQM|NCR/.test(text))).toEqual([]);
      expect(report.actions.flatMap((action) => action.factIds).filter((id) => id.includes('grap'))).toEqual(
        [],
      );
      expect(report.factSet.filter((fact) => fact.id.includes('grap'))).toEqual([]);
      expect(ctx.grap).toBeNull();
    }
    const ncr = cases.filter(({ ctx }) => ctx.grap?.stage === 'II');
    expect(ncr.every(({ report }) => report.actions.some((action) => action.id === 'grap-stage'))).toBe(true);
  });

  it('gives the Hindi notice the same actions as the English one, by id and line', () => {
    for (const { report } of cases) {
      const ids = report.actions.map((action) => action.id);
      expect(report.wording.en.actions.map((action) => action.id)).toEqual(ids);
      expect(report.wording.hi.actions.map((action) => action.id)).toEqual(ids);
      expect(report.notice.hi?.lines.slice(1, -1)).toEqual(
        report.wording.hi.actions.map((line) => line.text),
      );
      expect(report.notice.en.lines.slice(1, -1)).toEqual(report.wording.en.actions.map((line) => line.text));
      expect(hindiText(report).every((line) => /[ऀ-ॿ]/.test(line))).toBe(true);
    }
  });

  it('addresses a school to parents and staff and a society to residents', () => {
    for (const { ctx, report } of cases) {
      if (ctx.community.kind === 'school') {
        expect(englishText(report).filter((text) => /resident/i.test(text))).toEqual([]);
        expect(hindiText(report).filter((text) => text.includes('निवासी'))).toEqual([]);
        expect(report.notice.en.lines[0]).toMatch(/^Dear parents and staff,/);
      } else {
        const schoolWords = /\b(pupils?|parents?|schools?|students?|classrooms?|campus)\b/i;
        expect(englishText(report).filter((text) => schoolWords.test(text))).toEqual([]);
        expect(hindiText(report).filter((text) => /विद्यार्थ|अभिभावक|स्कूल|विद्यालय|कक्षा/.test(text))).toEqual([]);
        expect(report.notice.en.lines[0]).toMatch(/^Dear residents,/);
      }
    }
  });

  it('fits every notice on one page and matches the response contract', () => {
    for (const { report } of cases) {
      const body = {
        facts: report.facts,
        actions: report.actions,
        notice: report.notice,
        trace: sampleTrace(),
      };
      expect(noticeResponseSchema.safeParse(body).success).toBe(true);
      for (const text of [report.notice.en, report.notice.hi]) {
        const chars = (text?.title.length ?? 0) + (text?.lines.join('').length ?? 0);
        expect(chars).toBeLessThanOrEqual(3000);
      }
      expect(allText(report).filter((text) => /[{}<>]/.test(text) || text.includes(EM_DASH))).toEqual([]);
    }
  });
});
