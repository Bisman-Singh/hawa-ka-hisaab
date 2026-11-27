// English text for the source and GRAP actions and the notice frame, as data. Templates hold no digits:
// every number enters through a {placeholder} whose value carries its fact id.
import type { ActionId } from './rules.js';
import { same, type ActionText, type FrameText } from './text-en.js';

const SHARE = 'In Delhi in winter {studyYear},';

/** English text for the source, staff and GRAP actions. */
export const ACTIONS_EN_MORE = {
  'outdoor-staff': {
    title: same('Protect staff who work outdoors'),
    line: {
      school:
        'Give gate staff and others who work outside N{n95} masks, rotate outdoor duty and allow breaks indoors.',
      housing_society:
        'Guards, sweepers and gardeners work outside all day. Give them N{n95} masks, rotate outdoor duty and allow breaks indoors.',
    },
    detail: same(
      'You entered {staff} outdoor staff. The health ministry counts outdoor workers as vulnerable, and its advice to employers of construction workers asks for masks, rotation between tasks and regular breaks.',
    ),
    factIds: same([
      'community-advice-vulnerable-groups',
      'community-advice-workers',
      'community-mask-class-n95',
    ]),
  },
  'no-idling': {
    title: same('Engines off at the gate'),
    line: {
      school:
        'Drivers and parents should switch the engine off while waiting at the gate. Pupils should wait away from running vehicles.',
      housing_society:
        'Drivers, cabs and delivery riders should switch the engine off while waiting at the gate.',
    },
    detail: {
      school: `{vehicles} vehicles a day wait about {minutes} minutes each, which is {vehicleMinutes} vehicle-minutes of running engines. The health ministry names school gates as a place for precautions. ${SHARE} transport of all kinds made up {transportShare}% of fine particle pollution; no cited figure gives idling alone.`,
      housing_society: `{vehicles} vehicles a day wait about {minutes} minutes each, which is {vehicleMinutes} vehicle-minutes of running engines. ${SHARE} transport of all kinds made up {transportShare}% of fine particle pollution; no cited figure gives idling alone.`,
    },
    factIds: {
      school: ['community-share-transport', 'community-study-winter', 'community-advice-school-gates'],
      housing_society: ['community-share-transport', 'community-study-winter'],
    },
  },
  'stop-waste-burning': {
    title: same('No burning of leaves or waste'),
    line: {
      school:
        'Do not burn leaves, garbage or any waste on or near the campus. Hand it over for collection instead.',
      housing_society:
        'Do not burn leaves, garbage or any waste in or near the society. Hand it over for collection instead.',
    },
    detail: same(
      `The health ministry advises against burning wood, leaves, crop residues and waste in the open. ${SHARE} refuse burning made up {refuseShare}% of fine particle pollution across the city.`,
    ),
    factIds: same([
      'community-advice-open-burning',
      'community-share-refuse-burning',
      'community-study-winter',
    ]),
  },
  'generator-essential': {
    title: same('Run the generator only when essential'),
    line: same('Run the generator only during power cuts and only for essential needs.'),
    detail: same(
      `It runs {hours} hours a day now, as entered. ${SHARE} DG sets made up {dgShare}% of fine particle pollution. That share is for the whole city, not for this generator.`,
    ),
    factIds: same(['community-share-dg-sets', 'community-study-winter']),
  },
  'grap-stage': {
    title: same('GRAP Stage {stage} is in force in Delhi NCR'),
    line: same(
      'GRAP Stage {stage} is in force in Delhi NCR under the CAQM order of {orderDate}. Its citizen charter asks everyone not to idle vehicles, to use DG sets only for essential activities and not to burn waste in the open.',
    ),
    detail: same(
      'These steps are from the GRAP citizen charter for Stages I and II. Higher stages add further rules; read the order in force on the CAQM website.',
    ),
    factIds: same(['community-grap-charter', '{grapFact}']),
  },
  'grap-sports': {
    title: same('Reschedule sports competitions'),
    line: same(
      "CAQM has advised that physical sports competitions in NCR during November and December be rescheduled, to protect students' health.",
    ),
    detail: same('This advisory was noted by CAQM at the meeting that approved the revised GRAP schedule.'),
    factIds: same(['community-grap-sports']),
  },
} satisfies Partial<Record<ActionId, ActionText>>;

/** The English notice frame. */
export const FRAME_EN: FrameText = {
  title: {
    school: 'Air quality notice for parents and staff, {date}',
    housing_society: 'Air quality notice for residents, {date}',
  },
  greeting: { school: 'Dear parents and staff,', housing_society: 'Dear residents,' },
  reading: {
    station: 'the latest CPCB reading, for {time}, is {band}, with an AQI of {aqi} at the {station} station.',
    station_no_aqi: 'CPCB published no AQI for the nearest station, {station}, for {time}.',
    modelled:
      "a modelled estimate puts today's air at {band}, with an AQI of about {aqi}. It comes from CAMS via Open-Meteo for {time}, is not a measurement and tends to read low in cities.",
    none: 'no air reading is available right now.',
  },
  stale: ' This reading is more than three hours old.',
  early: ' The air changes through the day, so check the AQI again in the morning before outdoor activity.',
  closing: {
    school:
      "This notice from the school office follows the health ministry's air pollution advisory. It is general guidance, not medical advice. Anyone with breathlessness, cough or chest pain should see a doctor.",
    housing_society:
      "This notice from the managing committee follows the health ministry's air pollution advisory. It is general guidance, not medical advice. Anyone with breathlessness, cough or chest pain should see a doctor.",
  },
};
