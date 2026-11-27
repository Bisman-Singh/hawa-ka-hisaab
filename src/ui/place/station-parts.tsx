// The figures of a station slip: CPCB's AQI as published, never worked out here, and the hourly sub-indices.
// The short card leaves out the scale and the legend.
import { Fragment, type ReactElement } from 'react';
import type { StationReading } from '../../features/air/types.js';
import type { PollutantId } from '../../features/naqi/types.js';
import { BandLabel, BandScale } from '../components/Band.js';
import { BandLegend } from '../components/BandLegend.js';
import { AIR, NO_AQI, POLLUTANT_NAME } from './words.js';

/** CPCB's AQI as published with its band and, unless compact, its scale; or the words for a missing AQI. */
export function StationAqi(props: {
  readonly reading: StationReading;
  readonly at: string | null;
  readonly compact: boolean;
}): ReactElement {
  const { reading, at, compact } = props;
  if (reading.aqi === null) {
    const words = NO_AQI[reading.provider ?? 'cpcb_feed'];
    return (
      <>
        <div className="reading">
          <p className="aqi-none">{words.short}</p>
        </div>
        <p className="small">{words.note}</p>
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
      {compact ? null : (
        <>
          <BandScale value={value} band={band} label={AIR.cpcbAqi} />
          <BandLegend />
        </>
      )}
    </>
  );
}

/** One pollutant row of a slip: the pollutant and its value as shown. */
export interface PollutantRow {
  readonly id: PollutantId;
  readonly value: string | number;
}

/** Pollutants with their values, the main one marked in words and in bold. */
export function PollutantList(props: {
  readonly rows: readonly PollutantRow[];
  readonly main: PollutantId | null;
  readonly mark: string;
}): ReactElement {
  const { rows, main, mark } = props;
  return (
    <dl>
      {rows.map(({ id, value }) => (
        <Fragment key={id}>
          <dt className={id === main ? 'main' : undefined}>
            {POLLUTANT_NAME[id]}
            {id === main ? mark : ''}
          </dt>
          <dd className={id === main ? 'main' : undefined}>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** The hourly sub-index of each pollutant, highest first, labelled as not the AQI. */
export function SubIndices({ reading }: { readonly reading: StationReading }): ReactElement {
  const rows = reading.pollutants
    .flatMap((row) => (row.hourlySubIndex === null ? [] : [{ id: row.pollutant, value: row.hourlySubIndex }]))
    .sort((a, b) => b.value - a.value);
  return (
    <div className="subidx">
      <h3>{AIR.subHeading}</h3>
      <p className="small">{rows.length === 0 ? AIR.noHourly : AIR.subNote}</p>
      <PollutantList rows={rows} main={reading.aqi?.predominant ?? null} mark={AIR.mainMark} />
    </div>
  );
}
