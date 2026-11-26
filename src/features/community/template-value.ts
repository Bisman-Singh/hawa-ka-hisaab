// Building blocks for placeholder values: plain words, numbers, clock times, lists and dates, each with the
// fact values behind the numbers it shows.
import type { FactValue, Language } from '../../lib/types.js';
import { clockText, dateText, formatNumber, joinList } from './format.js';

/** A placeholder value in English and Hindi, with the fact values behind any number it shows. */
export interface TemplateValue {
  readonly en: string;
  readonly hi: string;
  readonly facts: readonly FactValue[];
}

/** Placeholder values by name. */
export type TemplateValues = Readonly<Record<string, TemplateValue>>;

/** A value with no number in it, such as a band name. */
export const plain = (en: string, hi = en): TemplateValue => ({ en, hi, facts: [] });

/** The same text in both languages, showing the given fact values. */
export const shown = (text: string, facts: readonly FactValue[]): TemplateValue => ({
  en: text,
  hi: text,
  facts,
});

/** A number as the notice writes it, with its fact value rounded the same way. */
export function numberValue(fact: FactValue): TemplateValue {
  const text = formatNumber(fact.value);
  return shown(text, [{ ...fact, value: Number(text) }]);
}

/** A clock time, with its hour and minute as two fact values. */
export function clockValue(
  id: string,
  label: string,
  [hour, minute]: readonly [number, number],
): TemplateValue {
  return shown(clockText(hour, minute), [
    { id, label: `${label}, hour`, value: hour, unit: 'hour' },
    { id, label: `${label}, minute`, value: minute, unit: 'minute' },
  ]);
}

/** The hour and minute of an HH:MM clock time. */
export const clockOf = (clock: string): [number, number] => [
  Number(clock.slice(0, 2)),
  Number(clock.slice(3, 5)),
];

/** A list joined with and in English and और in Hindi, carrying every item's facts. */
export function listValue(values: readonly TemplateValue[]): TemplateValue {
  const words = (lang: Language, and: string): string =>
    joinList(
      values.map((value) => value[lang]),
      and,
    );
  return { en: words('en', 'and'), hi: words('hi', 'और'), facts: values.flatMap((value) => value.facts) };
}

/** A date in each language, with its day and year as fact values. */
export function dateValue(id: string, label: string, isoDate: string): TemplateValue {
  return {
    en: dateText(isoDate, 'en'),
    hi: dateText(isoDate, 'hi'),
    facts: [
      { id, label: `${label}, day`, value: Number(isoDate.slice(8, 10)), unit: 'day' },
      { id, label: `${label}, year`, value: Number(isoDate.slice(0, 4)), unit: 'year' },
    ],
  };
}
