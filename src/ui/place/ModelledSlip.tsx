// The modelled path of the air card: dashed, labelled as a model estimate, never a reading, with why it is used,
// the means behind the index and the source. compact leaves out the scale and the means beside the plan.
import { Button } from '../components/Button.js';
import { type ReactElement, type ReactNode, useId } from 'react';
import type { ModelledReading } from '../../features/air/types.js';
import { BandLabel, BandScale } from '../components/Band.js';
import { ModelledSource } from './SourceLine.js';
import { PollutantList, type PollutantRow } from './station-parts.js';
import { AIR, modelledWhy, POLLUTANT_NAME } from './words.js';

type ComputedEstimate = Extract<ModelledReading['estimate'], { status: 'computed' }>;

/** Props of the modelled slip. where names the place; children hold the GRAP note. */
export interface ModelledSlipProps {
  readonly reading: ModelledReading;
  readonly where: string;
  readonly retry: () => void;
  readonly compact?: boolean;
  readonly children?: ReactNode;
}

function Estimate(props: {
  readonly estimate: ModelledReading['estimate'];
  readonly compact: boolean;
}): ReactElement {
  const { estimate, compact } = props;
  if (estimate.status === 'insufficient') {
    return (
      <div className="reading">
        <p className="aqi-none">{AIR.insufficient}</p>
      </div>
    );
  }
  const { value, band, predominant } = estimate;
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
      {compact ? null : <Means estimate={estimate} />}
    </>
  );
}

const meanRow = (row: ComputedEstimate['subIndices'][number]): PollutantRow => ({
  id: row.pollutant,
  value:
    row.unit === 'mg_m3'
      ? `${row.meanConcentration.toFixed(2)} mg/m³`
      : `${row.meanConcentration.toFixed(1)} µg/m³`,
});

function Means({ estimate }: { readonly estimate: ComputedEstimate }): ReactElement {
  const { value, band, predominant, subIndices } = estimate;
  return (
    <>
      <BandScale value={value} band={band} label={AIR.estimated} />
      <div className="subidx">
        <h3>{AIR.modelHeading}</h3>
        <p className="small">{AIR.modelNote}</p>
        <PollutantList rows={subIndices.map(meanRow)} main={predominant} mark={AIR.leadsMark} />
      </div>
    </>
  );
}

/** The modelled slip. A feed that did not answer gets a retry, since a station reading may come back. */
export function ModelledSlip(props: ModelledSlipProps): ReactElement {
  const { reading, where, retry, compact = false, children } = props;
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
      {reading.reason === 'feed_unavailable' ? <Button onClick={retry}>{AIR.retry}</Button> : null}
      <p>
        <b>{AIR.modelledLabel}</b>
      </p>
      <Estimate estimate={reading.estimate} compact={compact} />
      <ModelledSource reading={reading} />
      {children}
    </article>
  );
}
