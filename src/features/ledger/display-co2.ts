// A travel CO₂ effect laid out for the page: kilograms for one person, then whether it is there and back and
// how many share the vehicle. A range that could be a saving or a rise is never headlined as a saving.
import type { EffectDisplay } from './display.js';
import { fill } from '../../lib/template.js';
import type { EffectWords } from './display-words.js';
import { roundKg } from './format.js';
import type { Effect, WorkingInput } from './types.js';

type Co2Effect = Extract<Effect, { kind: 'co2' }>;

const valueOf = (inputs: readonly WorkingInput[], label: string): number | null =>
  inputs.find((input) => input.label === label)?.value ?? null;

function legsOf(effect: Co2Effect): 'both' | 'one' | 'day' | 'week' {
  if (effect.per !== 'trip') {
    return effect.per;
  }
  return valueOf(effect.working.inputs, 'Now: legs') === 2 ? 'both' : 'one';
}

function ridersOf(effect: Co2Effect, words: EffectWords): string | null {
  const { inputs } = effect.working;
  const count = { count: String(effect.occupancy) };
  if (valueOf(inputs, 'Instead: people in the vehicle') !== null) {
    return fill(words.riders.shared, count);
  }
  return valueOf(inputs, 'Now: people in the vehicle') === null ? null : fill(words.riders.now, count);
}

const kg = (words: EffectWords, value: number): string =>
  fill(words.kg, { size: String(Math.abs(roundKg(value))) });

function headlineOf(effect: Co2Effect, words: EffectWords): { text: string; crossing: string | null } {
  const ends = effect.range ? [effect.range.low, effect.range.high] : [effect.changeKg];
  const [low, high] = [Math.min(...ends), Math.max(...ends)];
  if (roundKg(low) < 0 && roundKg(high) > 0) {
    const text = fill(words.upTo, { size: fill(words.more, { size: kg(words, high) }) });
    return { text, crossing: fill(words.or, { size: fill(words.less, { size: kg(words, low) }) }) };
  }
  if (roundKg(effect.changeKg) === 0) {
    return { text: words.none, crossing: null };
  }
  const small = Math.min(Math.abs(roundKg(high)), Math.abs(roundKg(low)));
  const large = Math.max(Math.abs(roundKg(high)), Math.abs(roundKg(low)));
  const spanned = fill(words.span, { low: String(small), high: String(large) });
  const size = small === large ? kg(words, large) : fill(words.kg, { size: spanned });
  return { text: fill(effect.changeKg < 0 ? words.less : words.more, { size }), crossing: null };
}

function directionOf(effect: Co2Effect, mixed: boolean): EffectDisplay['direction'] {
  if (mixed) {
    return 'mixed';
  }
  if (roundKg(effect.changeKg) === 0) {
    return 'none';
  }
  return effect.changeKg < 0 ? 'less' : 'more';
}

/** A CO₂ effect laid out for the page. The headline leaves out CO₂, which the row's label names. */
export function co2Display(effect: Co2Effect, words: EffectWords): EffectDisplay {
  const head = headlineOf(effect, words);
  const parts = [head.crossing, words.legs[legsOf(effect)], ridersOf(effect, words)];
  const detail = parts.filter((part) => part !== null).join(', ');
  const twoWheeler = effect.working.factIds.includes('co2-scooter');
  return {
    direction: directionOf(effect, head.crossing !== null),
    headline: head.text,
    detail,
    note: effect.range === null ? null : words.co2Range[twoWheeler ? 'two_wheeler' : 'fuel'],
    sentence: `${fill(words.forEach, { headline: head.text, co2: words.co2.plain })}, ${detail}${words.stop}`,
  };
}
