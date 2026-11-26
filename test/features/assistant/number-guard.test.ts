// Adversarial tests for the number guard: every numeral in model text must match a value that code sent.
import { describe, expect, it } from 'vitest';
import { checkNumbers, collectAllowed } from '../../../src/features/assistant/number-guard.js';

const facts = collectAllowed([
  246,
  -0.6,
  -0.3,
  2.1,
  14,
  250,
  1234,
  '18:00',
  '16:00',
  '2026-11-24',
  'Cuts CO2 by 4.5 kg per trip',
  'reschedule-a2',
  'pm25-24h',
]);

const passes = (text: string) => checkNumbers([text], facts);

describe('checkNumbers passes text that only repeats values sent', () => {
  it.each([
    'The AQI is 246 today.',
    'This cuts exposure by 30 to 60%.',
    'This cuts exposure by 30% to 60%.',
    'This cuts exposure by 30 to 60 percent.',
    'Driving 14 km each way, carpooling saves about 2.1 kg CO2.',
    'The 14km trip saves 2.1kg of CO2 and the template saves 4.5 kg.',
    'PM2.5 and PM10 are high, wear an N95 mask.',
    'The PM 2.5 level is high.',
    'Move football to 16:00.',
    'Move football to 4 pm or 4:00 PM, or 6 p.m.',
    'शाम 4 बजे फुटबॉल खेलें।',
    'आज एक्यूआई २४६ है।',
    'Plan for 24 November, 24/11/2026, 2026-11-24 or Nov 24, 2026.',
    'योजना 24 नवंबर के लिए है।',
    'A purifier of 250 m³/h suits this room.',
    'About 1,234 or roughly 1,200 or 1,230 people.',
    'One purifier and 1 open window.',
    '',
  ])('%s', (text) => {
    expect(passes(text)).toEqual({ passed: true, unmatched: [] });
  });
});

describe('checkNumbers rejects numbers that were not sent', () => {
  it.each([
    ['The AQI is 999.', ['999']],
    ['The AQI is ९९९ today.', ['999']],
    ['आज एक्यूआई ४५० है।', ['450']],
    ['AQI450 right now.', ['450']],
    ['The AQI is ４５０.', ['450']],
    ['The AQI is ৯৯৯.', ['999']],
    ['The AQI is 𝟗𝟗𝟗.', ['999']],
    ['Exposure falls 45%.', ['45%']],
    ['Exposure falls by 30 points.', ['30']],
    ['It is 250 µg/m3, which is 3x the limit.', ['3']],
    ['The AQI is four hundred and fifty.', ['four', 'hundred', 'fifty']],
    ['It is twice the safe level and half the usual dose.', ['twice', 'half']],
    ['एक्यूआई चार सौ पचास है।', ['चार', 'सौ', 'पचास']],
    ['AQI paanch sau hai.', ['paanch', 'sau']],
    ['The AQI is 3 4 6.', ['3', '4', '6']],
    ['Go out at 7 pm.', ['7 pm']],
    ['Go out at 06:00.', ['06:00']],
    ['Plan for 25 November.', ['25 November']],
    ['The PM2.5 reading is 312.', ['312']],
    ['It saves 0 kg.', ['0']],
    ['The AQI is about 250 or 240.', ['240']],
    ['It saves 2.2 kg or 2.15 kg.', ['2.2', '2.15']],
    ['It is 10² times worse.', ['102']],
    ['The number is 1 lakh.', ['lakh']],
    ['It rose 1%.', ['1%']],
    ['A 24 hour AQI of 25.', ['24', '25']],
    ['A ratio of 1.5 means more.', ['1.5']],
  ])('%s', (text, unmatched) => {
    expect(passes(text)).toEqual({ passed: false, unmatched });
  });

  it('checks every text and lists each miss once', () => {
    expect(checkNumbers(['AQI 999', 'still 999', 'and 998'], facts)).toEqual({
      passed: false,
      unmatched: ['999', '998'],
    });
  });

  it('caps the list of misses for the trace', () => {
    const text = Array.from({ length: 80 }, (_, index) => String(5000 + index)).join(' ');
    const verdict = checkNumbers([text], facts);
    expect(verdict.passed).toBe(false);
    expect(verdict.unmatched).toHaveLength(50);
  });
});

describe('collectAllowed', () => {
  it('reads numbers, clock times, dates and numerals inside sentences, and skips code ids', () => {
    const allowed = collectAllowed([
      { a: [3, 'about 7 km'], start: '06:30', id: 'swap-a7', day: '2026-11-24' },
      null,
    ]);
    expect(allowed.numbers).toEqual([3, 7]);
    expect(allowed.times).toEqual([390]);
    expect(allowed.dates).toEqual([{ day: 24, month: 11, year: 2026 }]);
  });

  it('skips a date without a year, since code always sends full dates', () => {
    expect(collectAllowed(['on 24 November']).dates).toEqual([]);
  });

  it('allows nothing when nothing was sent, so any number fails', () => {
    expect(checkNumbers(['A 5 minute walk.'], collectAllowed([]))).toEqual({
      passed: false,
      unmatched: ['5'],
    });
  });
});
