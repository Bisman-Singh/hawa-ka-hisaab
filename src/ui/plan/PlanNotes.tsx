// Notes above the plan: the severe-day bulletin with the health ministry's words, and the note shown when fixed
// rules wrote the plan, with the reason and a way to ask the model again.
import { useId } from 'react';
import type { ReactElement } from 'react';
import { adviceText } from '../../config/facts/advice.js';
import type { AqiBand } from '../../features/naqi/types.js';
import type { PlanResponse } from '../../features/planner/types.js';
import { BandGlyph } from '../components/Band.js';
import { StateMessage } from '../components/StateMessage.js';
import { BAND_TEXT } from '../i18n/strings.js';
import { FALLBACK } from '../trace/strings.js';
import { AirBasisLine, type AirBasisLineProps } from './air-basis.js';
import { PLAN } from './strings.js';

/** The severe-day bulletin: the band, the reading and the health ministry's words for everyone and the vulnerable. */
export function Bulletin({ band, ...line }: AirBasisLineProps & { readonly band: AqiBand }): ReactElement {
  const id = useId();
  return (
    <div className="bulletin" role="note" aria-labelledby={id}>
      <BandGlyph band={band} />
      <h2 id={id}>{`${BAND_TEXT[band].name} ${PLAN.bulletinAir}`}</h2>
      <p>
        <AirBasisLine {...line} /> {PLAN.forEveryone} “{adviceText(band, 'general')}”. {PLAN.forVulnerable} “
        {adviceText(band, 'vulnerable')}”.
      </p>
    </div>
  );
}

/** The note shown when fixed rules wrote the words, with the reason and, where it can help, a way to ask again. */
export function ModelNote({
  response,
  again,
}: {
  readonly response: PlanResponse;
  readonly again: () => void;
}): ReactElement | null {
  const reason = response.trace.fallbackReason;
  if (response.trace.producedBy !== 'rules' || reason === null) {
    return null;
  }
  return (
    <StateMessage
      tone="status"
      glyph="model"
      title={reason === 'disabled' ? PLAN.modelOff : PLAN.modelDown}
      quiet
      level={2}
    >
      <p>{`${PLAN.modelDownBody} ${FALLBACK[reason]}`}</p>
      {reason === 'disabled' ? null : (
        <button className="btn btn-quiet" type="button" onClick={again}>
          {PLAN.tryModel}
        </button>
      )}
    </StateMessage>
  );
}
