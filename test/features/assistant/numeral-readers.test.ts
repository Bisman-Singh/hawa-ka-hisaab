// Tests for the numeral readers: the readers for each kind of match, and the unit mark on a measured number.
import { describe, expect, it } from 'vitest';
import { dateBy, readNumbers, readWord, timeBy } from '../../../src/features/assistant/numeral-readers.js';

const match = (pattern: RegExp, text: string): RegExpExecArray => {
  const found = pattern.exec(text);
  if (!found) {
    throw new Error('pattern did not match');
  }
  return found;
};

describe('dateBy', () => {
  it('reads two digit years as this century and refuses impossible dates', () => {
    const read = dateBy({ day: 1, month: 2, year: 3, named: false });
    expect(read(match(/(\d+)\/(\d+)\/(\d+)/, '5/6/27'))).toEqual([
      { kind: 'date', raw: '5/6/27', day: 5, month: 6, year: 2027 },
    ]);
    expect(read(match(/(\d+)\/(\d+)\/(\d+)/, '0/6/27'))).toEqual([]);
    expect(dateBy({ day: 1, month: 2, year: 3, named: true })(match(/(\d+) (\w+)()/, '5 Smarch'))).toEqual(
      [],
    );
    expect(dateBy({ day: 1, month: 2, year: 3, named: true })(match(/(\d+) ?(\w+)?/, '5'))).toEqual([]);
  });
});

describe('timeBy', () => {
  it('reads am, pm and bare hours, and refuses impossible times', () => {
    const read = timeBy({ hour: 1, minute: 2, half: 3 });
    expect(read(match(/(\d+):(\d+) ?(a|p)?/, '9:05 a'))).toEqual([
      { kind: 'time', raw: '9:05 a', minutes: [545] },
    ]);
    expect(read(match(/(\d+):(\d+) ?(a|p)?/, '9:05 p'))).toEqual([
      { kind: 'time', raw: '9:05 p', minutes: [1265] },
    ]);
    expect(read(match(/(\d+):(\d+)/, '9:60'))).toEqual([]);
    expect(timeBy({ hour: 3, minute: 1, half: 0 })(match(/(\d+)/, '30'))).toEqual([
      { kind: 'time', raw: '30', minutes: [30] },
    ]);
    expect(timeBy({ hour: 1, minute: 2, half: 0 })(match(/(\d+)()/, '9'))).toEqual([
      { kind: 'time', raw: '9', minutes: [540, 1260] },
    ]);
  });
});

describe('readNumbers and readWord', () => {
  it('mark a percent that follows and drop a trailing comma', () => {
    expect(readNumbers(match(/\d+,?/, '45, then'))).toEqual([
      { kind: 'number', raw: '45', value: 45, percent: false },
    ]);
    expect(readNumbers(match(/\d+/, '45 per cent'))).toEqual([
      { kind: 'number', raw: '45%', value: 45, percent: true },
    ]);
    expect(readWord(match(/\w+/, 'fifty percent'))).toEqual([
      { kind: 'number', raw: 'fifty', value: 50, percent: true },
    ]);
  });

  it('marks a number followed by a unit of measure, and only then', () => {
    expect(readNumbers(match(/\d+/, '1 kg of CO2'))).toEqual([
      { kind: 'number', raw: '1', value: 1, percent: false, measured: true },
    ]);
    expect(readNumbers(match(/\d+/, '2 गुना'))[0]).toMatchObject({ measured: true });
    expect(readNumbers(match(/\d+/, '1 bus'))[0]).not.toHaveProperty('measured');
    expect(readNumbers(match(/\d+/, '1 kgs'))[0]).not.toHaveProperty('measured');
  });

  it('gives a word missing from the table a value that matches nothing', () => {
    expect(readWord(match(/\w+/, 'umpteen'))[0]).toMatchObject({ value: Number.NaN });
  });
});
