// Builders that keep the fact tables short: a sourced number, or a passage quoted word for word.
import type { Fact, Range, Source } from '../../lib/types.js';

/** The parts of a number fact that differ from fact to fact. */
export interface NumberSpec {
  readonly id: string;
  readonly title: string;
  readonly value: number;
  readonly unit: string;
}

/** The parts of a quoted fact that differ from fact to fact. */
export interface QuoteSpec {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

/** A sourced number. range is set when the source gives a range, and value is then its low end. */
export function numberFact(spec: NumberSpec, source: Source, range: Range | null = null): Fact {
  return { kind: 'number', ...spec, range, source };
}

/** A passage quoted word for word in English from its source. */
export function quoteFact(spec: QuoteSpec, source: Source): Fact {
  return { kind: 'text', ...spec, lang: 'en', source };
}
