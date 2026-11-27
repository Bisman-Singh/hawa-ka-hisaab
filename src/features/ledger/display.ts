// Effects laid out for the page: a headline figure, a line with the range or basis, a short reason when the range
// is wide, and one plain sentence for screen readers and the model's fact labels. Numbers come from format.ts.
import type { Language, Range } from '../../lib/types.js';
import { co2Display } from './display-co2.js';
import { EFFECT_WORDS, fill, type EffectWords, type ExposureBasis } from './display-words.js';
import { percentOf, plannedChange, timesOf } from './format.js';
import type { Effect } from './types.js';

/** Which way an effect goes. mixed is a range that could be a cut or a rise, never headlined as either. */
export type EffectDirection = 'less' | 'more' | 'mixed' | 'none';

/** An effect as the page lays it out. note is null unless the range is wide. */
export interface EffectDisplay {
  readonly direction: EffectDirection;
  readonly headline: string;
  readonly detail: string;
  readonly note: string | null;
  readonly sentence: string;
}

type Style = 'display' | 'plain';

/** A range wider than this many percentage points gets a reason beside it. */
export const WIDE_POINTS = 30;

const BASIS_BY_FACT: readonly (readonly [string, ExposureBasis])[] = [
  ['exposure-dose-method', 'start_hour'],
  ['advice-ac-recirculate', 'closed_car'],
  ['exposure-onroad-quote', 'vehicle_air'],
  ['mask-n95-filtered', 'mask_fit'],
  ['breathing-adult-light', 'pace'],
  ['breathing-child-light', 'pace'],
];

function basisOf(factIds: readonly string[]): ExposureBasis {
  return BASIS_BY_FACT.find(([id]) => factIds.includes(id))?.[1] ?? 'other';
}

/** One change in words, such as "69% less", "20% more" or "2.4× as much". */
function one(words: EffectWords, change: number, style: Style): string {
  const size = Math.abs(percentOf(change));
  if (size === 0) {
    return words.none;
  }
  if (change > 1) {
    return fill(words.times[style], { size: String(timesOf(change)) });
  }
  return fill(change < 0 ? words.less : words.more, { size: `${String(size)}%` });
}

/** The sizes of a one-sided range without its direction, such as "54 to 76%" or "1.4 to 2.4× as much". */
function sizes(words: EffectWords, { low, high }: Range, style: Style): string {
  const [near, far] = low < 0 ? [high, low] : [low, high];
  if (far > 1 && near > 1) {
    const ends = { low: String(timesOf(near)), high: String(timesOf(far)) };
    return fill(words.times[style], { size: fill(words.span, ends) });
  }
  if (far > 1) {
    return fill(words.span, { low: one(words, near, style), high: one(words, far, style) });
  }
  return fill(words.span, {
    low: String(Math.abs(percentOf(near))),
    high: `${String(Math.abs(percentOf(far)))}%`,
  });
}

/** A one-sided range in words, such as "54 to 76% less". Multiples carry their own words. */
function span(words: EffectWords, range: Range, style: Style): string {
  const { low, high } = range;
  const bare = sizes(words, range, style);
  if (Math.max(low, high) > 1) {
    return bare;
  }
  return fill(low < 0 ? words.less : words.more, { size: bare });
}

interface Shape {
  readonly low: number;
  readonly high: number;
  readonly planned: number | null;
  readonly basis: ExposureBasis;
}

const crosses = ({ low, high }: Shape): boolean => percentOf(low) < 0 && percentOf(high) > 0;
const single = ({ low, high }: Shape): boolean => percentOf(low) === percentOf(high);

function directionOf(shape: Shape): EffectDirection {
  const lead = shape.planned ?? (crosses(shape) ? null : shape.low + shape.high);
  if (lead === null) {
    return 'mixed';
  }
  return percentOf(lead) === 0 ? 'none' : lead < 0 ? 'less' : 'more';
}

function headlineOf(words: EffectWords, shape: Shape, style: Style): string {
  if (shape.planned !== null) {
    return one(words, shape.planned, style);
  }
  if (crosses(shape)) {
    return fill(words.upTo, { size: one(words, shape.high, style) });
  }
  return single(shape) ? one(words, shape.low, style) : span(words, shape, style);
}

function detailOf(words: EffectWords, shape: Shape, style: Style): string {
  const basis = words.basis[shape.basis];
  if (crosses(shape)) {
    return `${fill(words.or, { size: one(words, shape.low, style) })}, ${words.crossing[shape.basis]}`;
  }
  if (shape.planned !== null && single(shape)) {
    return words.forecastOnly;
  }
  if (shape.planned === null) {
    return basis;
  }
  return `${fill(words.range, { span: sizes(words, shape, style) })}, ${basis}`;
}

function exposureDisplay(effect: Extract<Effect, { kind: 'exposure' }>, words: EffectWords): EffectDisplay {
  const { low, high } = effect.change;
  const shape: Shape = { low, high, planned: plannedChange(effect), basis: basisOf(effect.working.factIds) };
  const wide = crosses(shape) || percentOf(high) - percentOf(low) >= WIDE_POINTS;
  const plain = fill(words.breathedIn, { headline: headlineOf(words, shape, 'plain') });
  return {
    direction: directionOf(shape),
    headline: headlineOf(words, shape, 'display'),
    detail: detailOf(words, shape, 'display'),
    note: wide ? words.wide[shape.basis] : null,
    sentence: `${plain}, ${detailOf(words, shape, 'plain')}${words.stop}`,
  };
}

/** One relative change in plain words, such as "8% less" or "2.4 times as much", for sentences a plan writes. */
export function changeInWords(change: number, language: Language = 'en'): string {
  return one(EFFECT_WORDS[language], change, 'plain');
}

/** An effect laid out for the page in the given language, English when none is given. */
export function effectDisplay(effect: Effect, language: Language = 'en'): EffectDisplay {
  const words = EFFECT_WORDS[language];
  return effect.kind === 'exposure' ? exposureDisplay(effect, words) : co2Display(effect, words);
}
