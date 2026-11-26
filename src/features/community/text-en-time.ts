// English text for the timing and indoor actions, as data. Templates hold no digits: every number enters
// through a {placeholder} whose value carries its fact id.
import type { ActionId } from './rules.js';
import { same, type ActionText } from './text-en.js';

/** English text for moving outdoor activity, windows, mopping and masks. */
export const ACTIONS_EN_TIME = {
  'outdoor-move': {
    title: same('Move outdoor activity to the cleaner hours'),
    line: {
      school:
        "If the timetable allows, move outdoor activity at {worseTimes} to between {winStart} and {winEnd}, the cleanest hours in today's forecast.",
      housing_society:
        "If you can, move outdoor activity at {worseTimes} to between {winStart} and {winEnd}, the cleanest hours in today's forecast.",
    },
    detail: same(
      'The forecast puts {worseTimes} in the dirtier half of the day. It is a model forecast, not a measurement.',
    ),
    factIds: same(['community-advice-reschedule']),
  },
  'outdoor-light': {
    title: same('Keep outdoor activity light'),
    line: same('Keep outdoor activity light today, with no long or hard running.'),
    detail: same(
      'On a Moderate day the health ministry advises children, older people and others at risk to avoid prolonged or strenuous outdoor exertion.',
    ),
    factIds: same(['community-advice-moderate-vulnerable']),
  },
  windows: {
    title: same('Keep windows shut except at midday'),
    line: same(
      'Keep doors and windows shut in the morning and late evening. If rooms need air, open windows between {ventFrom} p.m. and {ventTo} p.m.',
    ),
    detail: {
      school:
        'The health ministry advises against opening external doors and windows in the morning and late evening on days with poor to severe AQI, and asks schools to close windows at these levels.',
      housing_society:
        'The health ministry advises against opening external doors and windows in the morning and late evening on days with poor to severe AQI.',
    },
    factIds: {
      school: [
        'community-advice-ventilation',
        'community-ventilation-from',
        'community-ventilation-until',
        'community-advice-school-windows',
      ],
      housing_society: [
        'community-advice-ventilation',
        'community-ventilation-from',
        'community-ventilation-until',
      ],
    },
  },
  'wet-mopping': {
    title: { school: 'Wet mop floors before pupils arrive', housing_society: 'Wet mop the common areas' },
    line: {
      school: 'Clean floors with a wet mop before pupils arrive, not with a broom.',
      housing_society: 'Clean lobbies, stairs and corridors with a wet mop, not a broom.',
    },
    detail: same(
      'The health ministry advises wet mopping instead of sweeping to reduce exposure to air pollution.',
    ),
    factIds: {
      school: ['community-advice-wet-mopping', 'community-advice-school-mopping'],
      housing_society: ['community-advice-wet-mopping'],
    },
  },
  masks: {
    title: same('Use a well-fitted N{n95} mask for short spells outdoors'),
    line: {
      school:
        'Adults who must be outdoors, such as gate staff, can wear a well-fitted N{n95} or N{n99} mask for short spells. Cloth, paper masks, handkerchiefs and scarves do not work. No tested evidence shows how well masks protect children.',
      housing_society:
        'If you must go out, a well-fitted N{n95} or N{n99} mask helps for short spells. Cloth, paper masks, handkerchiefs and scarves do not work.',
    },
    detail: same(
      'Worn by people in a lab test, an N{n95} filtered {n95Low} to {n95High}% of small particles without a fit test, and cloth masks {clothLow} to {clothHigh}%. Retail masks worn at rest let in {leakLow} to {leakHigh}%, mostly through poor fit.',
    ),
    factIds: same([
      'community-advice-masks',
      'community-mask-class',
      'community-mask-n95-filtration',
      'community-mask-cloth-filtration',
      'community-mask-fit-leakage',
    ]),
  },
} satisfies Partial<Record<ActionId, ActionText>>;
