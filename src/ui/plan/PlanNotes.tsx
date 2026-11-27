// Notes above the plan: the severe-day bulletin with the health ministry's words, the note shown when fixed rules
// wrote the plan, with the reason and a way to ask the model again, and the note on a plan made in this browser.
import { useId } from 'react';
import type { ReactElement } from 'react';
import { adviceFactId } from '../../config/facts/advice.js';
import { factQuote } from '../../config/facts/index.js';
import type { AqiBand } from '../../features/naqi/types.js';
import type { PlanResponse } from '../../features/planner/types.js';
import { BandGlyph } from '../components/Band.js';
import { StateMessage } from '../components/StateMessage.js';
import { CONSENT } from '../consent/strings.js';
import { useAppActions } from '../state/app-state.js';
import { BAND_TEXT } from '../i18n/strings.js';
import { fallbackText } from '../trace/strings.js';
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
        <AirBasisLine {...line} /> {PLAN.forEveryone} “{factQuote(adviceFactId(band, 'general'))}”.{' '}
        {PLAN.forVulnerable} “{factQuote(adviceFactId(band, 'vulnerable'))}”.
      </p>
    </div>
  );
}

/** The note on a plan made in this browser with the model off, with the way to turn the model on. */
export function LocalNote(): ReactElement {
  const { save } = useAppActions();
  return (
    <StateMessage tone="status" glyph="model" title={CONSENT.state.off} quiet level={2}>
      <p>{CONSENT.madeHere}</p>
      <button
        className="btn btn-quiet"
        type="button"
        onClick={() => {
          save({ modelChoice: 'on' });
        }}
      >
        {CONSENT.turnOn}
      </button>
    </StateMessage>
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
  const { trace } = response;
  const reason = trace.fallbackReason;
  if (trace.producedBy !== 'rules' || reason === null) {
    return null;
  }
  const down = trace.refusedBy === undefined ? PLAN.modelDown : PLAN.modelRefused;
  return (
    <StateMessage
      tone="status"
      glyph="model"
      title={reason === 'disabled' ? PLAN.modelOff : down}
      quiet
      level={2}
    >
      <p>{`${PLAN.modelDownBody} ${fallbackText(trace, reason)}`}</p>
      {reason === 'disabled' ? null : (
        <button className="btn btn-quiet" type="button" onClick={again}>
          {PLAN.tryModel}
        </button>
      )}
    </StateMessage>
  );
}
