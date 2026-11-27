// Purifier steps for the home: the smallest CADR each room with an area needs, by EPA sizing, against the
// purifier already there, and a plain ask for the size of a room whose purifier has no area to check against.
import type { Room } from '../household/types.js';
import { purifierCovers, purifierNeed } from '../ledger/purifier.js';
import type { Figure } from '../ledger/types.js';
import { bandAtLeast, type Situation } from './context.js';
import type { IndoorStep } from './types.js';
import { say, type TextKey } from './words.js';

function verdict(room: Room, need: Figure): TextKey {
  if (room.purifier === null) {
    return 'purifier_none';
  }
  const cadr = room.purifier.cadrM3PerHour;
  if (cadr === null) {
    return 'purifier_unknown';
  }
  return purifierCovers(cadr, need) ? 'purifier_ok' : 'purifier_small';
}

function sizedRoom(s: Situation, room: Room & { areaSqFt: number }, poor: boolean): IndoorStep {
  const need = purifierNeed(room.areaSqFt);
  const words = { room: s.lex.room[room.kind] };
  return {
    id: `purifier-${room.id}`,
    topic: 'purifier',
    title: say(s.lex, 'purifier_title', words),
    detail: `${say(s.lex, verdict(room, need))} ${say(s.lex, 'purifier_placing')}`,
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
  };
}

function unsizedRoom(s: Situation, room: Room): IndoorStep {
  return {
    id: `purifier-${room.id}`,
    topic: 'purifier',
    title: say(s.lex, 'purifier_add_title', { room: s.lex.room[room.kind] }),
    detail: say(s.lex, 'purifier_add_detail'),
    roomId: room.id,
    window: null,
    figure: null,
    factIds: ['purifier-cadr-per-area', 'unit-cfm-m3h'],
  };
}

/**
 * Purifier steps, bedrooms first, at most three: rooms with a purifier always, other rooms with an area on poor
 * or worse days. A purifier with no room area asks for the area instead of a figure.
 */
export function purifierSteps(s: Situation): IndoorStep[] {
  const poor = bandAtLeast(s.ctx.band, 'poor');
  const shown = s.ctx.household.home.rooms.filter((room) =>
    room.areaSqFt === null ? room.purifier !== null : poor || room.purifier !== null,
  );
  const ordered = shown.sort((a, b) => Number(b.kind === 'bedroom') - Number(a.kind === 'bedroom'));
  return ordered.slice(0, 3).map((room) => {
    const area = room.areaSqFt;
    return area === null ? unsizedRoom(s, room) : sizedRoom(s, { ...room, areaSqFt: area }, poor);
  });
}
