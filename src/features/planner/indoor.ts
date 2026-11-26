// Indoor air steps sized to the home: when to air the rooms, purifier size per room, masks, wet mopping, each
// listed smoke source, and corrections of common beliefs. Every step names its source.
import { meanPm25 } from '../ledger/curve.js';
import { clockOf } from '../ledger/format.js';
import { purifierCovers, purifierNeed } from '../ledger/purifier.js';
import type { Room } from '../household/types.js';
import type { Figure, WorkingInput } from '../ledger/types.js';
import { bandAtLeast, type Situation } from './context.js';
import { guidanceSteps } from './indoor-guidance.js';
import type { IndoorStep } from './types.js';

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

function ventilation(s: Situation): IndoorStep {
  const hours = [NOON, NOON + 1, NOON + 2, NOON + 3].flatMap((hour) => {
    const pm25 = meanPm25(s.day, hour * 60, 60);
    return pm25 === null ? [] : [{ hour, pm25 }];
  });
  const best = hours.sort((a, b) => a.pm25 - b.pm25)[0];
  const window = best
    ? { start: clockOf(best.hour * 60), end: clockOf(best.hour * 60 + 60) }
    : { start: '12:00', end: '16:00' };
  return {
    id: 'ventilate',
    topic: 'ventilation',
    title: `Air the rooms between ${window.start} and ${window.end} if they need it`,
    detail: best
      ? 'Keep doors and windows shut in the morning and late evening. The health ministry says to air rooms, if needed, in the early afternoon; this is the cleanest hour of that window in the forecast.'
      : 'Keep doors and windows shut in the morning and late evening. The health ministry says to air rooms, if needed, in the early afternoon.',
    roomId: null,
    window,
    figure: best ? windowFigure(s, best.hour, best.pm25) : null,
    factIds: ['advice-ventilate'],
  };
}

const ROOM_WORD: Readonly<Record<Room['kind'], string>> = {
  bedroom: 'bedroom',
  living: 'living room',
  kitchen: 'kitchen',
  study: 'study',
  other: 'room',
};

const PLACING =
  'Run it where people spend the most hours, such as a bedroom at night. Avoid purifiers that make ozone. Purifiers help indoors but do not replace cleaner outdoor air.';

function verdict(room: Room, need: Figure): string {
  if (room.purifier === null) {
    return 'A purifier for this room needs at least the CADR shown.';
  }
  const cadr = room.purifier.cadrM3PerHour;
  if (cadr === null) {
    return 'Check the CADR on your purifier against the size shown.';
  }
  return purifierCovers(cadr, need)
    ? 'Your purifier meets the size shown.'
    : 'Your purifier is smaller than this room needs.';
}

function purifiers(s: Situation): IndoorStep[] {
  const poor = bandAtLeast(s.ctx.band, 'poor');
  const sized = s.ctx.household.home.rooms.flatMap((room) =>
    room.areaSqFt !== null && (poor || room.purifier !== null)
      ? [{ room, need: purifierNeed(room.areaSqFt) }]
      : [],
  );
  const ordered = sized.sort((a, b) => Number(b.room.kind === 'bedroom') - Number(a.room.kind === 'bedroom'));
  return ordered.slice(0, 3).map(({ room, need }): IndoorStep => ({
    id: `purifier-${room.id}`,
    topic: 'purifier',
    title: `Purifier size for the ${ROOM_WORD[room.kind]}`,
    detail: `${verdict(room, need)} ${PLACING}`,
    roomId: room.id,
    window: null,
    figure: need,
    factIds: [
      'purifier-cadr-per-area',
      'unit-cfm-m3h',
      'advice-purifier-ozone',
      'purifier-limits-quote',
      ...(poor ? ['advice-purifier-days'] : []),
    ],
  }));
}

/** The indoor steps for this household and day, at most twelve, most pressing first. */
export function indoorSteps(s: Situation): IndoorStep[] {
  const poor = bandAtLeast(s.ctx.band, 'poor');
  return [...(poor ? [ventilation(s)] : []), ...purifiers(s), ...guidanceSteps(s)].slice(0, 12);
}
