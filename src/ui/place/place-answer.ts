// What a place answer means: the words for what was understood and, for a PIN, how rough the point is.
import type { Place } from '../../features/air/types.js';
import { fill } from '../../lib/template.js';
import { PLACE } from './words.js';

/** The place as understood, such as "PIN 110092, East Delhi, Delhi". Repeated parts such as a city named like its district show once. */
export function placeLabel(place: Place): string {
  const parts = place.label?.split(', ') ?? [place.name, place.district ?? '', place.state ?? ''];
  return [...new Set(parts.filter((part) => part !== ''))].join(', ');
}

/** The words for where the air is read: the place as understood, or the device's own location. */
export function placeWhere(place: Place | null): string {
  return place === null ? PLACE.yourLocation : placeLabel(place);
}

/** How exact the point is. A PIN answer is the approximate centre of its area; a town answer needs no note. */
export function placeNote(place: Place): string | null {
  if (place.resolution === 'pin_exact') {
    return PLACE.exactNote;
  }
  if (place.resolution !== 'pin_prefix' || !place.roughness) {
    return null;
  }
  const { prefix, pins, spreadKm } = place.roughness;
  return fill(PLACE.prefixNote, { pins, prefix, km: spreadKm.toFixed(0) });
}
