// The modelled path of the air card: dashed, labelled as a model estimate, with why it is used, the means
// behind the index and the source. It is never called a reading or a measurement.
import { Fragment, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { ModelledReading } from '../../features/air/types.js';
import { BandLabel, BandScale } from '../components/Band.js';
import { ModelledSource } from './SourceLine.js';
import { AIR, modelledWhy, POLLUTANT_NAME } from './strings.js';

/** Props of the modelled slip. where names the place; children hold the GRAP note. */
export interface ModelledSlipProps {
  readonly reading: ModelledReading;
  readonly where: string;
  readonly retry: () => void;
  readonly children?: ReactNode;
}

function Estimate({ estimate }: { readonly estimate: ModelledReading['estimate'] }): ReactElement {
  if (estimate.status === 'insufficient') {
    return (
      <div className="reading">
        <p className="aqi-none">{AIR.insufficient}</p>
      </div>
    );
  }
  const { value, band, predominant, subIndices } = estimate;
  return (
    <>
      <div className="reading">
        <p className="aqi">
          <span className="fig">{value}</span>
          <small>{AIR.estimated}</small>
          {band === 'severe' ? <small>{AIR.orMore}</small> : null}
        </p>
        <div>
          <BandLabel band={band} />
          <p>
            {AIR.ledBy} <b>{POLLUTANT_NAME[predominant]}</b>
          </p>
        </div>
      </div>
      <BandScale value={value} band={band} />
      <div className="subidx">
        <h3>{AIR.modelHeading}</h3>
        <p className="small">{AIR.modelNote}</p>
        <dl>
          {subIndices.map((row) => (
            <Fragment key={row.pollutant}>
              <dt className={row.pollutant === predominant ? 'main' : undefined}>
                {POLLUTANT_NAME[row.pollutant]}
                {row.pollutant === predominant ? ', leads the estimate' : ''}
              </dt>
              <dd className={row.pollutant === predominant ? 'main' : undefined}>
                {row.unit === 'mg_m3'
                  ? `${row.meanConcentration.toFixed(2)} mg/m³`
                  : `${row.meanConcentration.toFixed(1)} µg/m³`}
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </>
  );
}

/** The modelled slip. A feed that did not answer gets a retry, since a station reading may come back. */
export function ModelledSlip({ reading, where, retry, children }: ModelledSlipProps): ReactElement {
  const id = useId();
  return (
    <article className="slip modelled" aria-labelledby={`${id}-kind ${id}-name`}>
      <span className="slip-kind" id={`${id}-kind`}>
        {AIR.modelled}
      </span>
      <p className="station" id={`${id}-name`}>
        {where.charAt(0).toUpperCase() + where.slice(1)}
      </p>
      <p className="meta">{modelledWhy(reading.reason, reading.nearestStationKm)}</p>
      {reading.reason === 'feed_unavailable' ? (
        <button className="btn btn-quiet" type="button" onClick={retry}>
          {AIR.retry}
        </button>
      ) : null}
      <p>
        <b>{AIR.modelledLabel}</b>
      </p>
      <Estimate estimate={reading.estimate} />
      <ModelledSource reading={reading} />
      {children}
    </article>
  );
}
