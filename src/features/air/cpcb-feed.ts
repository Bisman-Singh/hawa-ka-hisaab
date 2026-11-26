// Parses the CPCB CAAQMS XML feed into checked station records. A station that fails a check is skipped.
// Documents that are too big, carry a DOCTYPE, are cut short, do not parse or have the wrong shape are refused.
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { err, ok, type Result } from '../../lib/result.js';
import { stationRecord } from './cpcb-station.js';
import type { StationFeed, StationProvider, StationRecord } from './types.js';

/** Largest feed accepted, in bytes. The real feed is about 430 kB for some 575 stations. */
export const CPCB_FEED_MAX_BYTES = 2 * 1024 * 1024;

/** Why a document was refused. */
export type FeedProblem = 'not_xml' | 'not_feed' | 'no_stations';

// The parser is lenient, so a feed cut short is caught by its missing closing root tag.
const COMPLETE = /<\/AqIndex>\s*$/;

const LISTS = new Set(['State', 'City', 'Station', 'Pollutant_Index']);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
  isArray: (name) => LISTS.has(name),
});

const list = z.array(z.unknown()).default([]);
const cityNode = z.object({ id: z.string(), Station: list });
const stateNode = z.object({ id: z.string(), City: list });
const documentNode = z.object({ AqIndex: z.object({ Country: z.object({ State: list }) }) });

function cityRecords(state: string, raw: unknown): StationRecord[] {
  const city = cityNode.safeParse(raw);
  return city.success
    ? city.data.Station.flatMap((station) => stationRecord(state, city.data.id, station))
    : [];
}

function stateRecords(raw: unknown): StationRecord[] {
  const state = stateNode.safeParse(raw);
  return state.success ? state.data.City.flatMap((city) => cityRecords(state.data.id, city)) : [];
}

function firstByName(records: readonly StationRecord[]): StationRecord[] {
  const byName = new Map<string, StationRecord>();
  for (const record of records) {
    if (!byName.has(record.station.name)) {
      byName.set(record.station.name, record);
    }
  }
  return [...byName.values()];
}

/** A feed from checked records, its hour the latest station hour, or no_stations when there are none. */
export function stationFeedOf(
  provider: StationProvider,
  stations: readonly StationRecord[],
): Result<StationFeed, 'no_stations'> {
  const feedHour = stations.reduce<string | null>(
    (latest, record) => (latest === null || record.readingHour > latest ? record.readingHour : latest),
    null,
  );
  return feedHour === null ? err('no_stations') : ok({ provider, feedHour, stations });
}

function readTree(text: string): unknown {
  try {
    const tree: unknown = parser.parse(text);
    return tree;
  } catch {
    return null;
  }
}

/** Parses one copy of the feed. The feed hour is the latest station hour; each station keeps its own hour. */
export function parseCpcbFeed(text: string): Result<StationFeed, FeedProblem> {
  if (text.length > CPCB_FEED_MAX_BYTES || /<!(DOCTYPE|ENTITY)/i.test(text)) {
    return err('not_feed');
  }
  const tree = COMPLETE.test(text) ? readTree(text) : null;
  if (tree === null) {
    return err('not_xml');
  }
  const document = documentNode.safeParse(tree);
  if (!document.success) {
    return err('not_feed');
  }
  return stationFeedOf('cpcb_feed', firstByName(document.data.AqIndex.Country.State.flatMap(stateRecords)));
}
