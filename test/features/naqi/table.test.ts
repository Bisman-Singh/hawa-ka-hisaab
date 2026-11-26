// Tests for the NAQI table read from the facts: CPCB's worked example, every breakpoint edge and the bands.
import { describe, expect, it } from 'vitest';
import { AIR_FACTS } from '../../../src/config/facts/air.js';
import { bandForIndex, buildNaqiTable, NAQI_TABLE, subIndex } from '../../../src/features/naqi/table.js';
import type { PollutantId } from '../../../src/features/naqi/types.js';
import type { Fact } from '../../../src/lib/types.js';

describe('CPCB worked example', () => {
  it('gives PM2.5 sub-index 51 at 31, 100 at 60 and 75 at 45 micrograms', () => {
    expect(subIndex('pm25', 31)).toBe(51);
    expect(subIndex('pm25', 60)).toBe(100);
    expect(subIndex('pm25', 45)).toBe(75);
  });
});

const EDGES: Readonly<Record<PollutantId, readonly number[]>> = {
  pm10: [0, 50, 51, 100, 101, 250, 251, 350, 351, 430],
  pm25: [0, 30, 31, 60, 61, 90, 91, 120, 121, 250],
  no2: [0, 40, 41, 80, 81, 180, 181, 280, 281, 400],
  o3: [0, 50, 51, 100, 101, 168, 169, 208, 209, 748],
  co: [0, 1, 1.1, 2, 2.1, 10, 10.1, 17, 17.1, 34],
  so2: [0, 40, 41, 80, 81, 380, 381, 800, 801, 1600],
  nh3: [0, 200, 201, 400, 401, 800, 801, 1200, 1201, 1800],
};
const INDEX_EDGES = [0, 50, 51, 100, 101, 200, 201, 300, 301, 400];

describe('breakpoint edges', () => {
  for (const [pollutant, edges] of Object.entries(EDGES)) {
    it(`maps every printed ${pollutant} edge to its index edge`, () => {
      const id = Object.values(NAQI_TABLE.pollutants).find((rule) => rule.pollutant === pollutant)?.pollutant;
      expect(id).toBe(pollutant);
      if (id === undefined) {
        return;
      }
      expect(edges.map((edge) => subIndex(id, edge))).toEqual(INDEX_EDGES);
    });
  }

  it('reads values between two printed rows at the table precision, rounding half up', () => {
    expect(subIndex('pm25', 30.4)).toBe(50);
    expect(subIndex('pm25', 30.5)).toBe(51);
    expect(subIndex('co', 1.04)).toBe(50);
    expect(subIndex('co', 1.05)).toBe(51);
    expect(subIndex('pm10', 100.49)).toBe(100);
  });

  it('gives the Severe floor 401 above the top printed row and never more', () => {
    expect(subIndex('pm25', 250.4)).toBe(400);
    expect(subIndex('pm25', 251)).toBe(401);
    expect(subIndex('pm25', 900)).toBe(401);
    expect(subIndex('co', 34.1)).toBe(401);
    expect(subIndex('o3', 749)).toBe(401);
  });

  it('derives each row start from the row before and agrees with every printed range', () => {
    for (const rule of Object.values(NAQI_TABLE.pollutants)) {
      const printed = rule.rows.map((_, index) => {
        const band = ['good', 'satisfactory', 'moderate', 'poor', 'very-poor'][index] ?? '';
        const fact = AIR_FACTS.find((candidate) => candidate.id === `naqi-${rule.pollutant}-${band}`);
        return fact?.kind === 'number' ? fact.range : null;
      });
      expect(printed).toEqual(rule.rows.map((row) => ({ low: row.low, high: row.high })));
    }
  });
});

describe('bands and the table', () => {
  it('names the band of an index value by the CPCB ranges', () => {
    const values = [0, 50, 51, 100, 101, 200, 201, 300, 301, 400, 401, 500, 620];
    expect(values.map(bandForIndex)).toEqual([
      'good',
      'good',
      'satisfactory',
      'satisfactory',
      'moderate',
      'moderate',
      'poor',
      'poor',
      'very_poor',
      'very_poor',
      'severe',
      'severe',
      'severe',
    ]);
  });

  it('takes averaging periods and units from the rules CPCB prints', () => {
    const hours = Object.fromEntries(
      Object.values(NAQI_TABLE.pollutants).map((rule) => [rule.pollutant, rule.hours]),
    );
    expect(hours).toEqual({ pm10: 24, pm25: 24, no2: 24, o3: 8, co: 8, so2: 24, nh3: 24 });
    expect(NAQI_TABLE.pollutants.co.unit).toBe('mg_m3');
  });

  it('refuses to build from facts with a breakpoint missing or of the wrong kind', () => {
    expect(() => buildNaqiTable(AIR_FACTS.filter((fact) => fact.id !== 'naqi-pm25-poor'))).toThrow(
      'naqi-pm25-poor',
    );
    const wrongKind = AIR_FACTS.map((fact): Fact =>
      fact.id === 'naqi-band-good'
        ? { kind: 'text', id: fact.id, title: 'x', text: 'x', lang: 'en', source: fact.source }
        : fact,
    );
    expect(() => buildNaqiTable(wrongKind)).toThrow('naqi-band-good');
  });
});
