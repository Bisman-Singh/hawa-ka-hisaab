// The figures of a station slip: CPCB's AQI as published, never worked out here, and the hourly sub-indices.
import { Fragment } from 'react';
import type { ReactElement } from 'react';
import type { StationReading } from '../../features/air/types.js';
import { BandLabel, BandScale } from '../components/Band.js';
import { BandLegend } from '../components/BandLegend.js';
import { providerWords } from './SourceLine.js';
import { AIR, POLLUTANT_NAME } from './strings.js';

/** CPCB's AQI as published with its band and scale, or the words for a missing AQI. at marks an old hour. */
export function StationAqi(props: {
  readonly reading: StationReading;
  readonly at: string | null;
}): ReactElement {
  const { reading, at } = props;
  if (reading.aqi === null) {
    const words = providerWords(reading);
    return (
      <>
        <div className="reading">
          <p className="aqi-none">{words.noAqi}</p>
        </div>
        <p className="small">{words.noAqiNote}</p>
      </>
    );
  }
  const { value, band, predominant } = reading.aqi;
  return (
    <>
      <div className="reading">
        <p className="aqi">
          <span className="fig">{value}</span>
          <small>{at === null ? AIR.cpcbAqi : `${AIR.cpcbAqi} at ${at}`}</small>
        </p>
        <div>
          <BandLabel band={band} />
          {predominant === null ? null : (
            <p>
              {AIR.main} <b>{POLLUTANT_NAME[predominant]}</b>
            </p>
          )}
        </div>
      </div>
      <BandScale value={value} band={band} />
      <BandLegend />
    </>
  );
}

/** The hourly sub-index of each pollutant, highest first, labelled as not the AQI. */
export function SubIndices({ reading }: { readonly reading: StationReading }): ReactElement {
  const main = reading.aqi?.predominant ?? null;
  const rows = reading.pollutants
    .flatMap((row) => (row.hourlySubIndex === null ? [] : [{ id: row.pollutant, value: row.hourlySubIndex }]))
    .sort((a, b) => b.value - a.value);
  return (
    <div className="subidx">
      <h3>{AIR.subHeading}</h3>
      <p className="small">{rows.length === 0 ? AIR.noHourly : AIR.subNote}</p>
      <dl>
        {rows.map(({ id, value }) => (
          <Fragment key={id}>
            <dt className={id === main ? 'main' : undefined}>
              {POLLUTANT_NAME[id]}
              {id === main ? AIR.mainMark : ''}
            </dt>
            <dd className={id === main ? 'main' : undefined}>{value}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}
