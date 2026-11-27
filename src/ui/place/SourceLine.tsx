// The source line of the air card: which copy of the data served the reading, its hour, and what that means for
// the AQI. Sentences and credits the facts hold are read from the facts registry, never retyped here.
import type { ReactElement } from 'react';
import { factQuote } from '../../config/facts/index.js';
import type { ModelledReading, StationProvider, StationReading } from '../../features/air/types.js';
import type { Source } from '../../lib/types.js';
import { Credit, factSource } from '../components/Credit.js';
import { istClock, istDay } from './hours.js';

/** What a provider means for the AQI: the closing sentence of the source line and the licence to link, if any. */
export interface ProviderWords {
  readonly after: string;
  readonly licence: Source | null;
}

/** The words for each copy of CPCB's data. On data.gov.in, CPCB's rule for the AQI and the licence come from the registry. */
export function providerWords(provider: StationProvider): ProviderWords {
  if (provider === 'cpcb_feed') {
    return { after: 'The AQI is shown as CPCB published it.', licence: null };
  }
  return {
    after: factQuote('naqi-worst-sub-index'),
    licence: factSource('credit-data-gov-in'),
  };
}

/** Props of the source line: the source record, the hour words, the closing words and any licence. */
export interface SourceLineProps {
  readonly source: Source;
  readonly hour: string;
  readonly after: ReactElement | string;
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

/** The source line of a station reading. A copy saved before provider existed came from the CPCB feed. */
export function StationSource({ reading }: { readonly reading: StationReading }): ReactElement {
  const words = providerWords(reading.provider ?? 'cpcb_feed');
  const hour = `reading for ${istClock(reading.readingHour)} IST on ${istDay(reading.readingHour)}`;
  return <SourceLine source={reading.source} hour={hour} after={words.after} licence={words.licence} />;
}

/** The source line of a modelled estimate, with the credit and licence link Open-Meteo asks for beside its data. */
export function ModelledSource({ reading }: { readonly reading: ModelledReading }): ReactElement {
  const after = (
    <>
      {"The index is worked out from these means with CPCB's NAQI table."} <Credit id="credit-open-meteo" />
    </>
  );
  return (
    <SourceLine
      source={reading.source}
      hour={`hours up to ${istClock(reading.modelHour)} IST`}
      after={after}
    />
  );
}
