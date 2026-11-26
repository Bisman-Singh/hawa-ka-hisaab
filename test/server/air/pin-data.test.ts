// Tests for the shipped PIN data: every part loads and checks, the counts match the source, and NCR fits its box.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NCR_BOX, NCR_PIN_MAX_KM, isNcrDistrict } from '../../../src/features/air/grap.js';
import { createPinDirectory } from '../../../src/server/air/pin-data.js';
import { samplePinTables } from '../../support/fake-air-sources.js';

const FOLDER = new URL('../../../src/server/data/pin/', import.meta.url);

describe('createPinDirectory', () => {
  it('loads every shipped part once, with the counts of the source', async () => {
    const directory = createPinDirectory();
    const tables = await directory.load();
    expect(await directory.load()).toBe(tables);
    expect(tables.centres.size).toBe(12_690);
    expect(tables.labels.size).toBe(12_690);
    expect(tables.prefixes.size).toBe(1_964);
    const parts = readdirSync(FOLDER).filter((name) => /^(centres|labels)-\d+\.json$/.test(name));
    const rows = parts.reduce((sum, name) => {
      const part: unknown = JSON.parse(readFileSync(new URL(name, FOLDER), 'utf8'));
      return sum + Object.keys(part ?? {}).length;
    }, 0);
    expect(rows).toBe(2 * 12_690);
  });

  it('uses a given loader once', async () => {
    let loads = 0;
    const directory = createPinDirectory(() => {
      loads += 1;
      return Promise.resolve(samplePinTables());
    });
    await Promise.all([directory.load(), directory.load()]);
    expect(loads).toBe(1);
  });

  it('keeps every NCR PIN centre more than 25 km inside the NCR box', async () => {
    const tables = await createPinDirectory().load();
    const margin = NCR_PIN_MAX_KM / 111;
    const ncr = [...tables.centres].filter(([pin]) => {
      const label = tables.labels.get(pin);
      return label !== undefined && isNcrDistrict(label);
    });
    expect(ncr.length).toBeGreaterThan(400);
    for (const [, [lat, lon]] of ncr) {
      expect(lat - margin).toBeGreaterThan(NCR_BOX.minLat);
      expect(lat + margin).toBeLessThan(NCR_BOX.maxLat);
      expect(lon - margin).toBeGreaterThan(NCR_BOX.minLon);
      expect(lon + margin).toBeLessThan(NCR_BOX.maxLon);
    }
  });
});
