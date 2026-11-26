// The station path of the air card: CPCB's AQI as published, its band, the hourly sub-indices and the source.
// An old or kept reading is drawn dim with its hour, and the AQI is never worked out here.
import { useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { FeedStatus, StationReading } from '../../features/air/types.js';
import { StateMessage } from '../components/StateMessage.js';
import { ageWords, istClock, istDay, isStale } from './hours.js';
import { StationSource } from './SourceLine.js';
import { StationAqi, SubIndices } from './station-parts.js';
import { AIR } from './strings.js';

/** Props of the station slip. where names the place the distance is from; children hold the GRAP note. */
export interface StationSlipProps {
  readonly reading: StationReading;
  readonly feed: FeedStatus;
  readonly where: string;
  readonly retry: () => void;
  readonly children?: ReactNode;
}

function OldReading({
  feed,
  hour,
  age,
  retry,
}: {
  feed: FeedStatus;
  hour: string;
  age: string;
  retry: () => void;
}) {
  if (feed.fetch === 'failed') {
    return (
      <StateMessage tone="status" glyph="feed" title={AIR.down}>
        <p>{AIR.downBody(`${hour} IST`)}</p>
        <button className="btn btn-quiet" type="button" onClick={retry}>
          {AIR.retry}
        </button>
      </StateMessage>
    );
  }
  return (
    <StateMessage tone="status" glyph="stale" title={AIR.stale}>
      <p>{AIR.staleBody(`${hour} IST`, age)}</p>
    </StateMessage>
  );
}

/** The station slip, with the stale or feed-down message above it when the reading is old. */
export function StationSlip({ reading, feed, where, retry, children }: StationSlipProps): ReactElement {
  const [now] = useState(() => Date.now());
  const id = useId();
  const hour = istClock(reading.readingHour);
  const old = feed.fetch === 'failed' || isStale(reading.readingHour, now, reading.stale);
  return (
    <article className={old ? 'slip dim' : 'slip'} aria-labelledby={`${id}-kind ${id}-name`}>
      {old ? (
        <OldReading feed={feed} hour={hour} age={ageWords(reading.readingHour, now)} retry={retry} />
      ) : null}
      <span className="slip-kind" id={`${id}-kind`}>
        {old ? `${AIR.station}, ${hour}` : AIR.station}
      </span>
      <p className="station" id={`${id}-name`}>
        {reading.station.name}
      </p>
      <p className="meta">
        {reading.station.city}. <b>{reading.distanceKm.toFixed(1)} km</b> from {where}. Reading for{' '}
        <b>{hour} IST</b> on {istDay(reading.readingHour)}.
      </p>
      <StationAqi reading={reading} at={old ? hour : null} />
      <SubIndices reading={reading} />
      <StationSource reading={reading} />
      {children}
    </article>
  );
}
