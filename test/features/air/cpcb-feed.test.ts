// Tests for the CPCB feed parser: the real fixture, its quirks, and documents that are broken or hostile.
import { describe, expect, it } from 'vitest';
import { CPCB_FEED_MAX_BYTES, parseCpcbFeed } from '../../../src/features/air/cpcb-feed.js';
import { stationRecordSchema } from '../../../src/features/air/schemas.js';
import type { StationFeed } from '../../../src/features/air/types.js';
import { readCpcbFixture } from '../../support/fixtures.js';

const fixture = readCpcbFixture();

function parsed(text: string): StationFeed {
  const result = parseCpcbFeed(text);
  if (!result.ok) {
    throw new Error(`expected a feed, got ${result.error}`);
  }
  return result.value;
}

function timed(text: string): { readonly result: ReturnType<typeof parseCpcbFeed>; readonly ms: number } {
  const started = performance.now();
  const result = parseCpcbFeed(text);
  return { result, ms: performance.now() - started };
}

const station = (attributes: string, body = ''): string =>
  `<Station id="Test, Town - PCB" lastupdate="24-11-2026 22:00:00" latitude="20.1" longitude="78.2" ${attributes}>${body}</Station>`;

const feedWith = (stations: string): string =>
  `<?xml version='1.0' encoding='UTF-8'?>\n<AqIndex><Country id="India"><State id="Test"><City id="Town">${stations}</City></State></Country></AqIndex>`;

describe('hostile and broken documents', () => {
  it('rejects a truncated feed instead of serving part of it', () => {
    const { result, ms } = timed(fixture.slice(0, Math.floor(fixture.length / 2)));
    expect(result).toEqual({ ok: false, error: 'not_xml' });
    expect(ms).toBeLessThan(1000);
  });

  it('rejects entity expansion without expanding anything', () => {
    const laughs = [
      '<?xml version="1.0"?>',
      '<!DOCTYPE AqIndex [<!ENTITY a "aaaaaaaaaa">',
      ...Array.from({ length: 9 }, (_, i) => `<!ENTITY ${'b'.repeat(i + 1)} "${'&a;'.repeat(10)}">`),
      ']>',
      '<AqIndex><Country id="&bbbbbbbbb;"/></AqIndex>',
    ].join('\n');
    const { result, ms } = timed(laughs);
    expect(result).toEqual({ ok: false, error: 'not_feed' });
    expect(ms).toBeLessThan(1000);
  });

  it('survives a huge attribute and skips only a station whose own values are out of bounds', () => {
    const other = station('', '').replace('Test, Town', 'Other');
    const { result, ms } = timed(feedWith(station(`junk="${'x'.repeat(1_500_000)}"`) + other));
    expect(ms).toBeLessThan(3000);
    expect(result.ok && result.value.stations).toHaveLength(2);
    const named = feedWith(station('', '').replace('Test, Town - PCB', 'y'.repeat(200_000)) + other);
    expect(parsed(named).stations.map((record) => record.station.name)).toEqual(['Other - PCB']);
  });

  it('refuses a document over the size bound before reading it', () => {
    const { result, ms } = timed(' '.repeat(CPCB_FEED_MAX_BYTES + 1));
    expect(result).toEqual({ ok: false, error: 'not_feed' });
    expect(ms).toBeLessThan(1000);
  });

  it('rejects a document with the wrong root, plain text and deep nesting', () => {
    expect(parseCpcbFeed('<rss><channel><item/></channel></rss>')).toEqual({ ok: false, error: 'not_xml' });
    expect(parseCpcbFeed('<AqIndex><Country id="A"/><Country id="B"/></AqIndex>')).toEqual({
      ok: false,
      error: 'not_feed',
    });
    expect(parseCpcbFeed('<AqIndex><State id="X"/></AqIndex>')).toEqual({ ok: false, error: 'not_feed' });
    expect(parseCpcbFeed('Service unavailable')).toEqual({ ok: false, error: 'not_xml' });
    expect(parseCpcbFeed('')).toEqual({ ok: false, error: 'not_xml' });
    const deep = `<AqIndex>${'<a>'.repeat(150)}${'</a>'.repeat(150)}</AqIndex>`;
    expect(parseCpcbFeed(deep)).toEqual({ ok: false, error: 'not_xml' });
  });

  it('never lets one bad station sink the rest', () => {
    const good = station('', '<Air_Quality_Index Value="88" Predominant_Parameter="PM10"/>');
    const bad = [
      good.replace('latitude="20.1"', 'latitude="north"').replace('Test, Town', 'Bad lat'),
      good
        .replace('lastupdate="24-11-2026 22:00:00"', 'lastupdate="yesterday"')
        .replace('Test, Town', 'Bad hour'),
      good.replace(' latitude="20.1" longitude="78.2"', '').replace('Test, Town', 'No coordinates'),
      good.replace('latitude="20.1"', 'latitude="51.5"').replace('Test, Town', 'Outside India'),
    ];
    const feed = parsed(feedWith([...bad, good].join('\n')));
    expect(feed.stations.map((record) => record.station.name)).toEqual(['Test, Town - PCB']);
  });
});

describe('the real fixture', () => {
  const feed = parsed(fixture);

  it('reads every station with its feed hour in IST and skips the empty state', () => {
    expect(feed.feedHour).toBe('2026-11-24T22:00:00+05:30');
    expect(feed.stations).toHaveLength(7);
    for (const record of feed.stations) {
      expect(stationRecordSchema.safeParse(record).success).toBe(true);
    }
  });

  it('keeps the published AQI and predominant pollutant as CPCB wrote them', () => {
    const jnu = feed.stations.find((record) => record.station.name === 'JNU, Delhi - DPCC');
    expect(jnu?.aqiValue).toBe(246);
    expect(jnu?.predominant).toBe('pm25');
    expect(jnu?.station).toEqual({
      name: 'JNU, Delhi - DPCC',
      city: 'Delhi',
      state: 'Delhi',
      lat: 28.540721,
      lon: 77.168544,
    });
    const kolkata = feed.stations.find((record) => record.station.city === 'Kolkata');
    expect(kolkata?.predominant).toBe('co');
    expect(kolkata?.aqiValue).toBe(65);
  });

  it('reads a blank AQI as null and NA values as null', () => {
    const rkPuram = feed.stations.find((record) => record.station.name.startsWith('R K Puram'));
    expect(rkPuram?.aqiValue).toBeNull();
    expect(rkPuram?.predominant).toBeNull();
    expect(rkPuram?.pollutants[0]).toEqual({
      pollutant: 'pm25',
      hourlySubIndex: 327,
      avg: null,
      min: null,
      max: null,
    });
    const mumbai = feed.stations.find((record) => record.station.city === 'Mumbai');
    expect(mumbai?.pollutants.find((row) => row.pollutant === 'o3')).toEqual({
      pollutant: 'o3',
      hourlySubIndex: null,
      avg: null,
      min: null,
      max: null,
    });
  });
});

describe('quirks the real feed can show', () => {
  it('keeps the first of two stations with the same name and the first of two rows for one pollutant', () => {
    const rows = '<Pollutant_Index id="PM10" Min="1" Max="3" Avg="2" Hourly_sub_index="2"/>';
    const twice = rows + rows.replaceAll('"2"', '"9"');
    const feed = parsed(feedWith(station('', twice) + station('', '').replace('78.2', '78.9')));
    expect(feed.stations).toHaveLength(1);
    expect(feed.stations[0]?.station.lon).toBe(78.2);
    expect(feed.stations[0]?.pollutants).toEqual([
      { pollutant: 'pm10', hourlySubIndex: 2, avg: 2, min: 1, max: 3 },
    ]);
  });

  it('drops pollutants it does not know and values that are not numbers', () => {
    const body =
      '<Pollutant_Index id="Pb" Min="1" Max="1" Avg="1" Hourly_sub_index="1"/>' +
      '<Pollutant_Index id="NO2" Min="-4" Max="" Avg="7.5" Hourly_sub_index="abc"/>' +
      '<Air_Quality_Index Value="12x" Predominant_Parameter="Pb"/>';
    const [record] = parsed(feedWith(station('', body))).stations;
    expect(record?.pollutants).toEqual([
      { pollutant: 'no2', hourlySubIndex: null, avg: 7.5, min: null, max: null },
    ]);
    expect(record?.aqiValue).toBeNull();
    expect(record?.predominant).toBeNull();
  });

  it('takes the latest station hour as the feed hour', () => {
    const late = station('', '').replace('22:00:00', '23:00:00').replace('Test, Town', 'Late');
    const feed = parsed(feedWith(station('', '') + late));
    expect(feed.feedHour).toBe('2026-11-24T23:00:00+05:30');
    expect(feed.stations.map((record) => record.readingHour)).toEqual([
      '2026-11-24T22:00:00+05:30',
      '2026-11-24T23:00:00+05:30',
    ]);
  });

  it('skips states, cities and rows without an id, and an AQI element that carries nothing', () => {
    const body = '<Pollutant_Index Min="1"/><Air_Quality_Index/>';
    const nameless = '<State><City id="A"/></State><State id="B"><City><Station/></City></State>';
    const text = feedWith(station('', body)).replace('<State id="Test">', `${nameless}<State id="Test">`);
    const [record] = parsed(text).stations;
    expect(record?.pollutants).toEqual([]);
    expect(record?.aqiValue).toBeNull();
    const noPredominant = parsed(feedWith(station('', '<Air_Quality_Index Value="50"/>'))).stations[0];
    expect(noPredominant).toMatchObject({ aqiValue: 50, predominant: null });
  });

  it('reads a state with one city and a city with one station', () => {
    const one = feedWith(
      station('', '<Pollutant_Index id="OZONE" Min="1" Max="2" Avg="1" Hourly_sub_index="2"/>'),
    );
    expect(parsed(one).stations[0]?.pollutants[0]?.pollutant).toBe('o3');
    const noCity = '<AqIndex><Country id="India"><State id="X"/></Country></AqIndex>';
    expect(parseCpcbFeed(noCity)).toEqual({ ok: false, error: 'no_stations' });
  });
});
