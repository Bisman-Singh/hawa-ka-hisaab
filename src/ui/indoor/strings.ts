// Words of the indoor air and swaps view.
import type { IndoorStep } from '../../features/planner/types.js';

/** Strings of the indoor view. */
export const INDOOR = {
  title: 'Indoor air and swaps',
  lede: 'For your home today. Each step names its source.',
  atHome: 'At home today',
  claims: 'Claims the evidence does not back',
  swaps: 'Instead of this, do that',
  swapsLede: 'Swaps for your own trips and habits. A number shows only where a published factor backs it.',
  instead: 'Instead of',
  doThis: 'Do',
  effect: 'Effect',
  reasonOnly: 'Reason only. There is no measured figure for this swap.',
  noFigure: 'No measured figure for this step.',
  noSwaps: 'No swaps apply to the trips and habits in this household.',
  noSteps: 'No steps of this kind for this home today.',
  sources: 'Sources',
};

/** Which part of the view each kind of indoor step belongs to. */
export const STEP_PART: Readonly<Record<IndoorStep['topic'], 'purifier' | 'home' | 'claims'>> = {
  purifier: 'purifier',
  ventilation: 'home',
  source_control: 'home',
  wet_mopping: 'home',
  mask: 'home',
  myth: 'claims',
};
