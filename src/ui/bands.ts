// The six CPCB AQI bands as the interface draws them: their order, AQI range and hatch class.
import { aqiBandSchema } from '../features/naqi/schemas.js';
import type { AqiBand } from '../features/naqi/types.js';

/** The bands, mildest first. */
export const BAND_ORDER: readonly AqiBand[] = aqiBandSchema.options;

/** How one band is drawn: its AQI range and the hatch class that tells it apart in black and white. */
export interface BandStyle {
  readonly lo: number;
  readonly hi: number;
  readonly hatch: string;
}

/** Ranges from CPCB's National Air Quality Index. The scale ends at 500, the top of Severe. */
export const BANDS: Readonly<Record<AqiBand, BandStyle>> = {
  good: { lo: 0, hi: 50, hatch: 'g-good' },
  satisfactory: { lo: 51, hi: 100, hatch: 'g-sat' },
  moderate: { lo: 101, hi: 200, hatch: 'g-mod' },
  poor: { lo: 201, hi: 300, hatch: 'g-poor' },
  very_poor: { lo: 301, hi: 400, hatch: 'g-vpoor' },
  severe: { lo: 401, hi: 500, hatch: 'g-severe' },
};

/** The range of a band in words, such as "301 to 400". */
export function rangeText(band: AqiBand): string {
  return `${String(BANDS[band].lo)} to ${String(BANDS[band].hi)}`;
}

/** Where an AQI sits along the six equal cells of the scale, from 0 to 1. Values past 500 stay at the end. */
export function scalePosition(value: number, band: AqiBand): number {
  const { lo, hi } = BANDS[band];
  const within = Math.min(1, Math.max(0, (value - lo) / (hi - lo + 1)));
  return (BAND_ORDER.indexOf(band) + within) / BAND_ORDER.length;
}
