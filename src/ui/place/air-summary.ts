// The air reading in one sentence for the live region, kept apart from the air card so the first screen can say it
// before the card's own code has loaded.
import type { AirResponse } from '../../features/air/types.js';
import { BAND_TEXT } from '../components/words.js';
import { AIR, NO_AQI } from './words.js';

/** One sentence for the live region when a reading arrives, such as "CPCB AQI 246, Poor.". */
export function airSummary({ reading }: AirResponse): string {
  if (reading.path === 'unavailable') {
    return `${AIR.unavailable}.`;
  }
  if (reading.path === 'modelled') {
    const { estimate } = reading;
    return estimate.status === 'computed'
      ? `${AIR.modelled} ${String(estimate.value)}, ${BAND_TEXT[estimate.band].name}.`
      : AIR.insufficient;
  }
  return reading.aqi === null
    ? NO_AQI[reading.provider ?? 'cpcb_feed'].short
    : `${AIR.cpcbAqi} ${String(reading.aqi.value)}, ${BAND_TEXT[reading.aqi.band].name}.`;
}
