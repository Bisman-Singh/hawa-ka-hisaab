// The air card in every state: loading, a failed request, the station or modelled slip, or no reading at all.
// The GRAP note shows only when the response carries one.
import { useId } from 'react';
import type { ReactElement } from 'react';
import type { AirResponse, GrapNotice } from '../../features/air/types.js';
import { Skeleton } from '../components/Progress.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { StateMessage } from '../components/StateMessage.js';
import type { Query } from '../data/request.js';
import { BAND_TEXT } from '../i18n/strings.js';
import { dateWords } from './hours.js';
import { ModelledSlip } from './ModelledSlip.js';
import { providerWords } from './SourceLine.js';
import { StationSlip } from './StationSlip.js';
import { AIR, GRAP_STAGES, UNAVAILABLE_WHY } from './strings.js';

/** One sentence for the live region when a reading arrives, such as "CPCB AQI 246, Poor.". */
export function airSummary({ reading }: AirResponse): string {
  if (reading.path === 'unavailable') {
    return `${AIR.unavailable}.`;
  }
  if (reading.path === 'modelled') {
    const { estimate } = reading;
    return estimate.status === 'computed'
      ? `${AIR.modelled} ${String(estimate.value)}, ${BAND_TEXT[estimate.band].name}.`
      : AIR.insufficient;
  }
  return reading.aqi === null
    ? providerWords(reading).noAqi
    : `${AIR.cpcbAqi} ${String(reading.aqi.value)}, ${BAND_TEXT[reading.aqi.band].name}.`;
}

function AirSkeleton({ where }: { readonly where: string }): ReactElement {
  const id = useId();
  return (
    <article className="slip" aria-busy="true" aria-labelledby={id}>
      <p className="status" id={id}>
        {AIR.loading(where)}
      </p>
      <div aria-hidden="true">
        <Skeleton size="w80" tall />
        <Skeleton size="w60" />
        <div className="reading">
          <Skeleton size="big" />
          <div>
            <Skeleton size="w60" tall />
            <Skeleton size="w80" />
          </div>
        </div>
        <Skeleton size="w45" />
        <Skeleton size="w80" />
        <Skeleton size="w60" />
      </div>
    </article>
  );
}

function GrapNote({ grap }: { readonly grap: GrapNotice }): ReactElement {
  return (
    <p className="grap">
      <b>{AIR.grapLead}</b> {GRAP_STAGES[grap.stage]}, by CAQM order dated {dateWords(grap.orderDate)}.
    </p>
  );
}

/** Props of the air card: the air request and the words for the place it is for. */
export interface AirCardProps {
  readonly air: Query<AirResponse>;
  readonly where: string;
}

/** The air card for the current place. */
export function AirCard({ air, where }: AirCardProps): ReactElement {
  const { state, retry } = air;
  if (state.status === 'failed') {
    return <RequestFailure failure={state.failure} retry={retry} />;
  }
  if (state.status !== 'done') {
    return <AirSkeleton where={where} />;
  }
  const { reading, feed, grap } = state.data;
  const note = grap === null ? null : <GrapNote grap={grap} />;
  switch (reading.path) {
    case 'station':
      return (
        <StationSlip reading={reading} feed={feed} where={where} retry={retry}>
          {note}
        </StationSlip>
      );
    case 'modelled':
      return (
        <ModelledSlip reading={reading} where={where} retry={retry}>
          {note}
        </ModelledSlip>
      );
    case 'unavailable':
      return (
        <StateMessage tone="alert" glyph="feed" title={AIR.unavailable}>
          <p>{UNAVAILABLE_WHY[reading.reason]}</p>
          <button className="btn" type="button" onClick={retry}>
            {AIR.retry}
          </button>
        </StateMessage>
      );
  }
}
