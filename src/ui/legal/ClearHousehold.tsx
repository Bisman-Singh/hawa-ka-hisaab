// The control that clears what this browser keeps for the app: the household, the place, the plan language and the
// model choice, and the typed description held in memory. It asks first, says what it cleared, and can undo it.
import { type ReactElement, useState } from 'react';
import { Button } from '../components/Button.js';
import { calling } from '../handlers.js';
import { useAnnounce } from '../hooks/announcer.js';
import { setIntake } from '../household/intake-store.js';
import { useFocusLater } from '../hooks/focus.js';
import { type SavedFields, useAppActions, useAppState } from '../state/app-state.js';
import { PRIVACY } from './words.js';

type Step =
  | { readonly at: 'start' }
  | { readonly at: 'confirm' }
  | { readonly at: 'cleared'; readonly kept: SavedFields };

/** The steps of clearing: ask, clear, undo; each move focuses the control that comes next and says what happened. */
function useClearing(id: string) {
  const state = useAppState();
  const { forget, save } = useAppActions();
  const announce = useAnnounce();
  const focusLater = useFocusLater();
  const [step, setStep] = useState<Step>({ at: 'start' });
  const go = (next: Step, focus: string, said: string | null): void => {
    setStep(next);
    focusLater(`${id}-${focus}`);
    if (said !== null) {
      announce(said);
    }
  };
  const { household, location, place, language, modelChoice } = state;
  const clear = (): void => {
    forget();
    setIntake(null);
    go(
      { at: 'cleared', kept: { household, location, place, language, modelChoice } },
      'undo',
      PRIVACY.cleared,
    );
  };
  const undo = (kept: SavedFields): void => {
    save(kept);
    go({ at: 'start' }, 'clear', PRIVACY.restored);
  };
  const held = household !== null || location !== null || modelChoice !== null;
  return {
    step,
    held,
    clear,
    undo,
    ask: () => {
      go({ at: 'confirm' }, 'ask', null);
    },
    keep: () => {
      go({ at: 'start' }, 'clear', null);
    },
  };
}

/** The clear button, its confirmation, then what was cleared with Undo; or a line saying nothing is kept. */
export function ClearHousehold({ id }: { readonly id: string }): ReactElement {
  const { step, held, clear, undo, ask, keep } = useClearing(id);
  if (step.at === 'confirm') {
    return (
      <>
        <p id={`${id}-ask`} tabIndex={-1}>
          <b>{PRIVACY.confirm}</b>
        </p>
        <div className="actions">
          <Button look="main" onClick={clear}>
            {PRIVACY.yes}
          </Button>
          <Button onClick={keep}>{PRIVACY.no}</Button>
        </div>
      </>
    );
  }
  if (step.at === 'cleared') {
    return (
      <div className="actions">
        <p role="status">{PRIVACY.cleared}</p>
        <Button id={`${id}-undo`} onClick={calling(undo, step.kept)}>
          {PRIVACY.undo}
        </Button>
      </div>
    );
  }
  return held ? (
    <>
      <p>{PRIVACY.clearNote}</p>
      <Button look="main" id={`${id}-clear`} onClick={ask}>
        {PRIVACY.clearButton}
      </Button>
    </>
  ) : (
    <p>{PRIVACY.nothing}</p>
  );
}
