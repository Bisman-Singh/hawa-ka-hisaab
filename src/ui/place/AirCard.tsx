// The air card in every state: loading, a failed request, the station or modelled slip, or no reading at all.
// The GRAP note shows only when the response carries one. compact is the short card beside the day plan.
import { Button } from '../components/Button.js';
import type { ReactElement } from 'react';
import type { AirResponse, GrapNotice } from '../../features/air/types.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { StateMessage } from '../components/StateMessage.js';
import type { Query } from '../data/request.js';
import { AirSkeleton } from './AirSkeleton.js';
import { dateText } from '../../lib/time.js';
import { ModelledSlip } from './ModelledSlip.js';
import { StationSlip } from './StationSlip.js';
import { AIR, GRAP_STAGES, unavailableWhy } from './words.js';

function GrapNote({ grap }: { readonly grap: GrapNotice }): ReactElement {
  return (
    <p className="grap">
      <b>{AIR.grapLead}</b> {GRAP_STAGES[grap.stage]}, by CAQM order dated {dateText(grap.orderDate)}.
    </p>
  );
}

/** Props of the air card: the air request, the words for the place, and whether to leave out the detail. */
export interface AirCardProps {
  readonly air: Query<AirResponse>;
  readonly where: string;
  readonly compact?: boolean;
}

/** The air card for the current place. */
export function AirCard({ air, where, compact = false }: AirCardProps): ReactElement {
  const { state, retry } = air;
  if (state.status === 'failed') {
    return <RequestFailure failure={state.failure} retry={retry} />;
  }
  if (state.status !== 'done') {
    return <AirSkeleton where={where} />;
  }
  const { reading, feed, grap } = state.data;
  const note = grap === null ? null : <GrapNote grap={grap} />;
  const slip = { where, retry, compact };
  switch (reading.path) {
    case 'station':
      return (
        <StationSlip reading={reading} feed={feed} {...slip}>
          {note}
        </StationSlip>
      );
    case 'modelled':
      return (
        <ModelledSlip reading={reading} {...slip}>
          {note}
        </ModelledSlip>
      );
    case 'unavailable':
      return (
        <StateMessage tone="alert" glyph="feed" title={AIR.unavailable}>
          <p>{unavailableWhy(reading.reason)}</p>
          <Button look="main" onClick={retry}>
            {AIR.retry}
          </Button>
        </StateMessage>
      );
  }
}
