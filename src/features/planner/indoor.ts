// Indoor air steps sized to the home: when to air the rooms, purifier size per room, masks, wet mopping, each
// listed smoke source, and corrections of common beliefs. Every step names its source.
import { meanPm25 } from '../ledger/curve.js';
import { clockOf } from '../../lib/time.js';
import type { Figure, WorkingInput } from '../ledger/types.js';
import { bandAtLeast, type Situation } from './context.js';
import { guidanceSteps } from './indoor-guidance.js';
import { purifierSteps } from './indoor-purifier.js';
import type { IndoorStep } from './types.js';
import { say } from './words.js';

const NOON = 12;
const SHUT_HOURS = [6, 7, 8, 9, 18, 19, 20, 21, 22];

function forecast(label: string, value: number): WorkingInput {
  return { label, value, unit: 'µg/m³', from: 'forecast', factId: null };
}

function windowFigure(s: Situation, hour: number, pm25: number): Figure | null {
  const shut = SHUT_HOURS.flatMap((at) => s.day.get(at) ?? []);
  const mean = shut.reduce((sum, value) => sum + value, 0) / shut.length;
  if (shut.length === 0 || mean <= 0) {
    return null;
  }
  return {
    label: 'Change in forecast PM2.5 against the morning and late evening hours',
    value: (pm25 / mean - 1) * 100,
    unit: 'percent',
    working: {
      formula:
        'Forecast PM2.5 in the chosen hour divided by the mean of the morning and late evening hours, minus one, as a percent.',
      inputs: [
        forecast(`Forecast PM2.5, ${clockOf(hour * 60)} hour, a model`, pm25),
        forecast('Forecast PM2.5, morning and late evening mean, a model', mean),
      ],
      factIds: ['advice-ventilate'],
    },
  };
}

function cleanestHour(s: Situation): { hour: number; pm25: number } | null {
  const hours = [NOON, NOON + 1, NOON + 2, NOON + 3].flatMap((hour) => {
    const pm25 = meanPm25(s.day, hour * 60, 60);
    return pm25 === null ? [] : [{ hour, pm25 }];
  });
  return hours.sort((a, b) => a.pm25 - b.pm25)[0] ?? null;
}

type VentText = Pick<IndoorStep, 'title' | 'detail' | 'window' | 'figure'>;

function ventStep(text: VentText): IndoorStep {
  return { id: 'ventilate', topic: 'ventilation', roomId: null, factIds: ['advice-ventilate'], ...text };
}

function openDay(s: Situation, best: { hour: number } | null): IndoorStep | null {
  if (s.dayKind === 'mild') {
    const text = { title: say(s.lex, 'vent_mild_title'), detail: say(s.lex, 'vent_mild_detail') };
    return ventStep({ ...text, window: null, figure: null });
  }
  if (best === null || s.dayKind !== 'moderate') {
    return null;
  }
  const window = { start: clockOf(best.hour * 60), end: clockOf(best.hour * 60 + 60) };
  const text = {
    title: say(s.lex, 'vent_moderate_title', window),
    detail: say(s.lex, 'vent_moderate_detail'),
  };
  return ventStep({ ...text, window, figure: null });
}

/**
 * When to air the rooms. On poor to severe days the advice is to keep windows shut in the morning and late
 * evening and air in the early afternoon; on a moderate day only the cleanest early afternoon hour is named; on a
 * mild day the windows can open whenever. Unknown air gives no step.
 */
function ventilation(s: Situation): IndoorStep | null {
  const best = cleanestHour(s);
  if (!bandAtLeast(s.ctx.band, 'poor')) {
    return openDay(s, best);
  }
  const window = best
    ? { start: clockOf(best.hour * 60), end: clockOf(best.hour * 60 + 60) }
    : { start: '12:00', end: '16:00' };
  return ventStep({
    title: say(s.lex, 'vent_title', window),
    detail: say(s.lex, best ? 'vent_detail' : 'vent_detail_no_curve'),
    window,
    figure: best ? windowFigure(s, best.hour, best.pm25) : null,
  });
}

/** The indoor steps for this household and day, at most twelve, most pressing first. */
export function indoorSteps(s: Situation): IndoorStep[] {
  const vent = ventilation(s);
  return [...(vent ? [vent] : []), ...purifierSteps(s), ...guidanceSteps(s)].slice(0, 12);
}
