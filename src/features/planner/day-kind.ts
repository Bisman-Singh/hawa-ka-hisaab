// Maps an AQI band to the kind of day a plan describes. Unknown air gives an unknown day, never a guess.
import type { AqiBand } from '../naqi/types.js';

/** The kind of day a plan describes. */
export type DayKind = 'mild' | 'moderate' | 'severe' | 'unknown';

const BY_BAND: Readonly<Record<AqiBand, DayKind>> = {
  good: 'mild',
  satisfactory: 'mild',
  moderate: 'moderate',
  poor: 'moderate',
  very_poor: 'severe',
  severe: 'severe',
};

/** The day kind for a band, or unknown when the band is not known. */
export function dayKindForBand(band: AqiBand | null): DayKind {
  return band === null ? 'unknown' : BY_BAND[band];
}

/** Action kinds that restrict the day. A mild day carries none of them. */
export const RESTRICTING_KINDS: ReadonlySet<string> = new Set(['protect', 'reschedule', 'move_indoors']);
