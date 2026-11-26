// The air a plan was built on, in words: the station reading the air card shows when it is the same reading,
// or the modelled estimate's label. Source wording comes from the reading and the air facts, not from here.
import type { ReactElement } from 'react';
import { AIR_FACTS } from '../../config/facts/air.js';
import type { AirResponse, StationReading } from '../../features/air/types.js';
import { clockText, istParts } from '../../features/community/format.js';
import type { AirBasis } from '../../features/planner/types.js';
import { PLAN } from './strings.js';

/** The IST clock time of an ISO instant, such as 22:00. */
export function istClock(iso: string): string {
  const parts = istParts(Date.parse(iso));
  return clockText(parts.hour, parts.minute);
}

/** The text of an air fact, such as the CPCB rule for the AQI. Empty when the id is not an air quote. */
export function airQuote(id: string): string {
  const fact = AIR_FACTS.find((found) => found.id === id);
  return fact?.kind === 'text' ? fact.text : '';
}

/** Props of the basis line: the plan's air basis and the air response held on this page. */
export interface AirBasisLineProps {
  readonly basis: AirBasis;
  readonly air: AirResponse | null;
}

/** A station reading in words: AQI, station, hour and source, with the AQI rule when data.gov.in served it. */
export function StationLine({ reading }: { readonly reading: StationReading }): ReactElement {
  const rule = reading.provider === 'data_gov_in' ? ` ${airQuote('naqi-worst-sub-index')}` : '';
  const blank = reading.aqi === null ? ` ${PLAN.noAqi}` : '';
  return (
    <>
      {reading.aqi === null ? null : (
        <>
          {PLAN.aqi} <span className="fig">{reading.aqi.value}</span> {PLAN.at}{' '}
        </>
      )}
      {reading.station.name}, {PLAN.readingFor} {istClock(reading.readingHour)} {PLAN.ist}.{blank}{' '}
      {PLAN.sourceIs} {reading.source.title}.{rule}
    </>
  );
}

/**
 * The station line when the page holds the same station reading the plan used, the modelled label on the
 * modelled path, and nothing when the air is unavailable or the page holds another reading.
 */
export function AirBasisLine({ basis, air }: AirBasisLineProps): ReactElement | null {
  if (basis.path === 'modelled') {
    return <>{PLAN.modelled}</>;
  }
  const reading = air?.reading ?? null;
  return reading?.path === 'station' && reading.readingHour === basis.readingHour ? (
    <StationLine reading={reading} />
  ) : null;
}
