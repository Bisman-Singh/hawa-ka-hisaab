// What a place answer means: the words for what was understood and, for a PIN, how rough the point is.
import type { Place } from '../../features/air/types.js';

const USE = 'used only to find the nearest monitoring station.';

/** The place as understood, such as "PIN 110092, East Delhi, Delhi". Repeated parts such as a city named like its district show once. */
export function placeLabel(place: Place): string {
  const parts = place.label?.split(', ') ?? [place.name, place.district ?? '', place.state ?? ''];
  return [...new Set(parts.filter((part) => part !== ''))].join(', ');
}

/** How exact the point is. A PIN answer is the approximate centre of its area; a town answer needs no note. */
export function placeNote(place: Place): string | null {
  if (place.resolution === 'pin_exact') {
    return `Approximate centre of the PIN area, ${USE}`;
  }
  if (place.resolution !== 'pin_prefix' || !place.roughness) {
    return null;
  }
  const { prefix, pins, spreadKm } = place.roughness;
  return `This PIN is not in the table, so this is the approximate centre of the ${String(pins)} known PINs starting ${prefix}, most within ${spreadKm.toFixed(0)} km of it, ${USE} Your town name gives a closer match.`;
}
