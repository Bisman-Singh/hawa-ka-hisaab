// Fills {placeholders} in templates and keeps every fact value behind the numbers it wrote, so the fact set
// sent with a notice is exactly the set of numbers the notice shows.
import type { FactValue, Language } from '../../lib/types.js';
import type { TemplateValues } from './template-value.js';

/** Fills templates in one language at a time and reports the facts it used. */
export interface Renderer {
  readonly fill: (template: string, lang: Language) => string;
  readonly factSet: () => FactValue[];
}

/** Fact values with duplicates removed, where a duplicate has the same id and value. */
export function uniqueFacts(facts: readonly FactValue[]): FactValue[] {
  return [
    ...new Map(facts.map((fact): [string, FactValue] => [`${fact.id}|${String(fact.value)}`, fact])).values(),
  ];
}

/** A renderer over the given values. A placeholder with no value is left as written, which tests catch. */
export function createRenderer(values: TemplateValues): Renderer {
  const used: FactValue[] = [];
  return {
    fill: (template, lang) =>
      template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
        const value = values[name];
        if (value === undefined) {
          return match;
        }
        used.push(...value.facts);
        return value[lang];
      }),
    factSet: () => uniqueFacts(used),
  };
}
