// Tests for reading one CPCB Station element: the IST stamp, published values and the checks that skip a station.
import { describe, expect, it } from 'vitest';
import { cpcbStampToIso, stationRecord } from '../../../src/features/air/cpcb-station.js';

const node = {
  id: 'Test, Town - PCB',
  lastupdate: '24-11-2026 22:00:00',
  latitude: '20.1',
  longitude: '78.2',
  Pollutant_Index: [{ id: 'PM2.5', Min: '10', Max: '90', Avg: '61', Hourly_sub_index: '75' }],
  Air_Quality_Index: { Value: '61', Predominant_Parameter: 'PM2.5' },
};

describe('cpcbStampToIso', () => {
  it('turns the CPCB stamp into an IST timestamp and refuses anything else', () => {
    expect(cpcbStampToIso(' 01-02-2027 05:00:00 ')).toBe('2027-02-01T05:00:00+05:30');
    expect(cpcbStampToIso('2027-02-01 05:00')).toBeNull();
  });
});

describe('stationRecord', () => {
  it('reads a station as CPCB published it', () => {
    expect(stationRecord('State', 'Town', node)).toEqual([
      {
        station: { name: 'Test, Town - PCB', city: 'Town', state: 'State', lat: 20.1, lon: 78.2 },
        aqiValue: 61,
        predominant: 'pm25',
        pollutants: [{ pollutant: 'pm25', hourlySubIndex: 75, avg: 61, min: 10, max: 90 }],
        readingHour: '2026-11-24T22:00:00+05:30',
      },
    ]);
  });

  it('cleans control, format and bidi characters out of names before anything shows or sends them', () => {
    const [record] = stationRecord('State\u0007', 'Town\u200B', {
      ...node,
      id: 'Station \u202Eevil\u202C \u0007',
    });
    expect(record?.station).toMatchObject({ name: 'Station evil', city: 'Town', state: 'State' });
  });

  it('gives nothing for a node that is not a station or a station with a blank name', () => {
    expect(stationRecord('State', 'Town', 'text')).toEqual([]);
    expect(stationRecord('State', 'Town', { ...node, id: '  ' })).toEqual([]);
    expect(stationRecord('', 'Town', node)).toEqual([]);
  });
});
