// Tests for the building blocks of placeholder values.
import { describe, expect, it } from 'vitest';
import {
  clockOf,
  clockValue,
  dateValue,
  listValue,
  numberValue,
  plain,
  shown,
} from '../../../src/features/community/template-value.js';

describe('template values', () => {
  it('carry no facts for plain words and the given facts for shown text', () => {
    expect(plain('Poor', 'खराब')).toEqual({ en: 'Poor', hi: 'खराब', facts: [] });
    expect(plain('II')).toEqual({ en: 'II', hi: 'II', facts: [] });
    expect(shown('62', []).hi).toBe('62');
  });

  it('round a number and its fact value the same way', () => {
    expect(numberValue({ id: 'input-idle-minutes', label: 'minutes', value: 2.25, unit: 'minutes' })).toEqual(
      {
        en: '2.3',
        hi: '2.3',
        facts: [{ id: 'input-idle-minutes', label: 'minutes', value: 2.3, unit: 'minutes' }],
      },
    );
  });

  it('split clock times and dates into the numbers they show', () => {
    expect(clockOf('07:45')).toEqual([7, 45]);
    expect(clockValue('input-assembly', 'assembly', [7, 45]).facts.map((fact) => fact.value)).toEqual([
      7, 45,
    ]);
    expect(dateValue('notice-date', 'notice date', '2026-11-26')).toMatchObject({
      en: '26 Nov 2026',
      hi: '26 नवंबर 2026',
    });
  });

  it('join lists in each language and keep every fact', () => {
    const list = listValue([
      shown('10:30', [{ id: 'a', label: 'a', value: 10, unit: 'h' }]),
      shown('15:00', []),
    ]);
    expect(list).toMatchObject({ en: '10:30 and 15:00', hi: '10:30 और 15:00' });
    expect(list.facts).toHaveLength(1);
  });
});
