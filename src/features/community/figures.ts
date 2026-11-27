// Computed facts for a society or school. Each is a plain count or sum of what was entered, set beside a cited
// city-wide share where one exists. None is a mass, a concentration or an emission figure.
import { idlesAtGate, runsDgSet } from './rules.js';
import type { Timing } from './timing.js';
import type { CommunityInput } from './types.js';
import {
  buildFigure,
  cited,
  entered,
  forecastHour,
  type FigureSpec,
  type FigureWithFacts,
} from './working.js';

function vulnerable(c: CommunityInput): FigureSpec | null {
  const counts: readonly (readonly [string, string, number | null | undefined])[] = [
    ['input-pupils', 'pupils', c.kind === 'school' ? c.pupils : null],
    ['input-children', 'children', c.children],
    ['input-older-adults', 'older adults', c.olderAdults],
    ['input-outdoor-staff', 'outdoor staff', c.outdoorStaff],
  ];
  const terms = counts.flatMap(([id, label, value]) =>
    value === null || value === undefined ? [] : [entered(id, [label, 'people'], value)],
  );
  const value = terms.reduce((sum, term) => sum + term.input.value, 0);
  const label = 'People the health advisory counts as vulnerable, from your counts';
  const formula = `The sum of the counts you entered: ${terms.map((term) => term.input.label).join(', ')}.`;
  const factIds = ['community-advice-vulnerable-groups'];
  return value === 0
    ? null
    : { id: 'computed-vulnerable-people', label, value, unit: 'people', formula, terms, factIds };
}

function generator(c: CommunityInput): FigureSpec | null {
  return c.generator === null || !runsDgSet(c)
    ? null
    : {
        id: 'input-generator-hours',
        label:
          'Generator running time, as entered, beside the DG set share of Delhi winter fine particle pollution',
        value: c.generator.hoursPerDay,
        unit: 'hours a day',
        formula:
          'Hours a day as entered. The DG set share is for the whole of Delhi in one winter, not for this generator.',
        terms: [
          entered('input-generator-hours', ['generator hours a day', 'hours'], c.generator.hoursPerDay),
          cited('community-share-dg-sets'),
          cited('community-study-winter'),
        ],
        factIds: ['community-share-dg-sets', 'community-study-winter'],
      };
}

function idling(c: CommunityInput): FigureSpec | null {
  return c.gateIdling === null || !idlesAtGate(c)
    ? null
    : {
        id: 'computed-idling-vehicle-minutes',
        label:
          'Engine running time at the gate, beside the transport share of Delhi winter fine particle pollution',
        value: c.gateIdling.vehiclesPerDay * c.gateIdling.idleMinutes,
        unit: 'vehicle-minutes a day',
        formula:
          'Vehicles a day times the minutes each waits with its engine on. An activity total, not an emission figure. The transport share covers all driving in Delhi, not idling alone.',
        terms: [
          entered('input-gate-vehicles', ['vehicles a day', 'vehicles'], c.gateIdling.vehiclesPerDay),
          entered('input-idle-minutes', ['minutes each', 'minutes'], c.gateIdling.idleMinutes),
          cited('community-share-transport'),
          cited('community-study-winter'),
        ],
        factIds: ['community-share-transport', 'community-study-winter'],
      };
}

function worsePeriods(c: CommunityInput, timing: Timing): FigureSpec | null {
  return timing.window === null || c.outdoorPeriods.length === 0
    ? null
    : {
        id: 'computed-outdoor-in-worse-hours',
        label: "Outdoor periods in the dirtier half of today's forecast hours",
        value: timing.periods.filter((period) => period.worse === true).length,
        unit: 'outdoor periods',
        formula:
          'Periods whose forecast hours average above the middle value of the day. The cleanest three hours are shown for comparison. The forecast is a model, not a measurement.',
        terms: [
          entered('input-outdoor-periods', ['outdoor periods entered', 'periods'], c.outdoorPeriods.length),
          forecastHour('cleaner window starts', timing.window.start),
          forecastHour('cleaner window ends', timing.window.end),
        ],
        factIds: ['community-advice-reschedule'],
      };
}

/** A computed fact with the fact values behind it, from the working module. */
export type { FigureWithFacts } from './working.js';

/** The computed facts that the inputs and the forecast support, with the fact values behind them. */
export function buildFigures(community: CommunityInput, timing: Timing): FigureWithFacts[] {
  const specs = [
    vulnerable(community),
    generator(community),
    idling(community),
    worsePeriods(community, timing),
  ];
  return specs.flatMap((spec) => (spec === null ? [] : [buildFigure(spec)]));
}
