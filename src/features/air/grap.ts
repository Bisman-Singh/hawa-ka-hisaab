// GRAP for Delhi NCR only: whether a point lies in NCR, and the stage left in force by the dated CAQM order.
// The stage is what that order says on its date, never a claim about today; the notice carries the date.
import { AIR_FACTS } from '../../config/facts/air.js';
import { GRAP_ORDER } from '../../config/facts/air/sources.js';
import { numberFactValue } from '../naqi/table.js';
import { nearestPinLabel } from './pin.js';
import { grapNoticeSchema } from './schemas.js';
import type { GrapNotice, Location, PinTables } from './types.js';

/**
 * The NCR districts of the ncr-districts fact, by the GeoNames district names the PIN labels use. GeoNames keeps
 * older parent districts, each wholly inside NCR: Gurgaon holds Gurugram and Nuh, Faridabad holds Palwal, Bhiwani
 * holds Charkhi Dadri, Ghaziabad holds Hapur and Muzaffarnagar holds Shamli. All of Delhi is in NCR.
 */
export const NCR_DISTRICTS: Readonly<Record<string, readonly string[]>> = {
  Haryana: [
    'Faridabad',
    'Gurgaon',
    'Rohtak',
    'Sonipat',
    'Rewari',
    'Jhajjar',
    'Panipat',
    'Bhiwani',
    'Mahendragarh',
    'Jind',
    'Karnal',
  ],
  'Uttar Pradesh': ['Meerut', 'Ghaziabad', 'Gautam Buddha Nagar', 'Bulandshahr', 'Bagpat', 'Muzaffarnagar'],
  Rajasthan: ['Alwar', 'Bharatpur'],
};

/** A box holding every PIN centre in those districts with a margin of over 25 km. Outside it no lookup is made. */
export const NCR_BOX: Readonly<Record<'minLat' | 'maxLat' | 'minLon' | 'maxLon', number>> = {
  minLat: 26.5,
  maxLat: 30.1,
  minLon: 75.3,
  maxLon: 78.7,
};

/** A point counts as NCR when the nearest PIN centre is this close and lies in an NCR district. */
export const NCR_PIN_MAX_KM = 25;

const STAGES = ['none', 'I', 'II', 'III', 'IV'];

/** The GRAP notice from the order in the facts: highest stage left in force, the order date and the fact id. */
export const GRAP_NOTICE: GrapNotice = grapNoticeSchema.parse({
  region: 'delhi_ncr',
  stage: STAGES[numberFactValue(AIR_FACTS, 'grap-stage-order')],
  orderDate: GRAP_ORDER.published,
  factId: 'grap-stage-order',
});

/** True when a district and state from the PIN labels are in NCR. */
export function isNcrDistrict([district, state]: readonly [string, string]): boolean {
  return state === 'Delhi' || (NCR_DISTRICTS[state]?.includes(district) ?? false);
}

/** True when a point lies in the box around NCR, so the PIN table is worth reading. */
export function nearNcr(location: Location): boolean {
  const box = NCR_BOX;
  return (
    location.lat >= box.minLat &&
    location.lat <= box.maxLat &&
    location.lon >= box.minLon &&
    location.lon <= box.maxLon
  );
}

/** The GRAP notice for a point in NCR, by its nearest PIN centre, or null anywhere else. */
export function grapNoticeAt(tables: PinTables, location: Location): GrapNotice | null {
  const nearest = nearNcr(location) ? nearestPinLabel(tables, location) : null;
  return nearest && nearest.km <= NCR_PIN_MAX_KM && isNcrDistrict(nearest.label) ? GRAP_NOTICE : null;
}
