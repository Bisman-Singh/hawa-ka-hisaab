// The source line of the air card: which copy of the data served the reading, its hour, and what that means for
// the AQI. Every provider's wording sits here, with the sentences the air facts hold quoted from them.
import type { ReactElement } from 'react';
import { AIR_FACTS } from '../../config/facts/air.js';
import { GODL_INDIA } from '../../config/facts/air/sources.js';
import type { ModelledReading, StationProvider, StationReading } from '../../features/air/types.js';
import type { Source } from '../../lib/types.js';
import { istClock, istDay } from './hours.js';

const quoted = (id: string): string =>
  AIR_FACTS.flatMap((fact) => (fact.kind === 'text' && fact.id === id ? [fact.text] : [])).join('');

/** What a provider means for the AQI: the closing sentence of the source line and the words for a missing AQI. */
export interface ProviderWords {
  readonly after: string;
  readonly licence: Source | null;
  readonly noAqi: string;
  readonly noAqiNote: string;
}

/** The words for each copy of CPCB's data. */
export const PROVIDER_WORDS: Readonly<Record<StationProvider, ProviderWords>> = {
  cpcb_feed: {
    after: 'The AQI is shown as CPCB published it.',
    licence: null,
    noAqi: 'CPCB published no AQI for this station this hour.',
    noAqiNote: "This app shows CPCB's AQI as published and never works one out for a station.",
  },
  data_gov_in: {
    after: quoted('naqi-worst-sub-index'),
    licence: GODL_INDIA,
    noAqi: 'No AQI for this station this hour.',
    noAqiNote:
      "CPCB's rule needs at least three pollutants, one of them PM2.5 or PM10, and this station has fewer this hour.",
  },
};

/** The words for a station reading. A copy saved before provider existed came from the CPCB feed. */
export function providerWords(reading: StationReading): ProviderWords {
  return PROVIDER_WORDS[reading.provider ?? 'cpcb_feed'];
}

/** Props of the source line: the source record, the hour words and the closing sentence. */
export interface SourceLineProps {
  readonly source: Source;
  readonly hour: string;
  readonly after: string;
  readonly licence?: Source | null;
}

/** "Source: <title>, <publisher>, <hour>. <after>" with links to the source and any licence. */
export function SourceLine({ source, hour, after, licence = null }: SourceLineProps): ReactElement {
  return (
    <p className="source">
      Source: <a href={source.url}>{source.title}</a>, {source.publisher}, {hour}. {after}
      {licence === null ? null : (
        <>
          {' '}
          Licence: <a href={licence.url}>{licence.title}</a>.
        </>
      )}
    </p>
  );
}

/** The source line of a station reading. */
export function StationSource({ reading }: { readonly reading: StationReading }): ReactElement {
  const words = providerWords(reading);
  const hour = `reading for ${istClock(reading.readingHour)} IST on ${istDay(reading.readingHour)}`;
  return <SourceLine source={reading.source} hour={hour} after={words.after} licence={words.licence} />;
}

/** The source line of a modelled estimate, with the credit Open-Meteo asks for. */
export function ModelledSource({ reading }: { readonly reading: ModelledReading }): ReactElement {
  const after = `The index is worked out from these means with CPCB's NAQI table. ${quoted('credit-open-meteo')}.`;
  return (
    <SourceLine
      source={reading.source}
      hour={`hours up to ${istClock(reading.modelHour)} IST`}
      after={after}
    />
  );
}
