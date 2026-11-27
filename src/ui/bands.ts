// The six CPCB AQI bands as the interface draws them: their order, AQI range and hatch class. The ranges are read
// from CPCB's NAQI table in the facts registry, so the scale and the legend hold no copy of their own.
import { factNumber } from '../config/facts/index.js';
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

/** The low and high ends of a number fact, both its value when it has no range. */
export function factSpan(id: string): { readonly lo: number; readonly hi: number } {
  const { value, range } = factNumber(id);
  return { lo: value, hi: range === null ? value : range.high };
}

const style = (band: AqiBand, hatch: string): BandStyle => ({
  ...factSpan(`naqi-band-${band.replace('_', '-')}`),
  hatch,
});

/** Ranges from CPCB's National Air Quality Index, as the registry holds them. The scale ends at 500. */
export const BANDS: Readonly<Record<AqiBand, BandStyle>> = {
  good: style('good', 'g-good'),
  satisfactory: style('satisfactory', 'g-sat'),
  moderate: style('moderate', 'g-mod'),
  poor: style('poor', 'g-poor'),
  very_poor: style('very_poor', 'g-vpoor'),
  severe: style('severe', 'g-severe'),
};

/** The range of a band in words, such as "301 to 400". */
export function rangeText(band: AqiBand): string {
  return `${String(BANDS[band].lo)} to ${String(BANDS[band].hi)}`;
}

/** Where a value sits along the six equal cells of the scale, from 0 to 1. Values past 500 stay at the end. */
export function scalePosition(value: number, band: AqiBand): number {
  const { lo, hi } = BANDS[band];
  const within = Math.min(1, Math.max(0, (value - lo) / (hi - lo + 1)));
  return (BAND_ORDER.indexOf(band) + within) / BAND_ORDER.length;
}
