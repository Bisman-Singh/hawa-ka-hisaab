// Facts behind the air card: the NAQI table, the GRAP order for Delhi NCR, the NCR districts and the credit
// line of every data source. Other code reads these by id; the facts index gathers AIR_FACTS.
import type { Fact, Source } from '../../lib/types.js';
import { NAQI_FACTS } from './air/naqi.js';
import {
  CPCB_FEED,
  DATA_GOV_AQI,
  GEONAMES_POSTAL,
  GODL_INDIA,
  GRAP_ORDER,
  NCR_AREAS,
  OPEN_METEO_AIR,
} from './air/sources.js';

const quote = ([id, title, text]: readonly [string, string, string], source: Source): Fact => ({
  kind: 'text',
  id,
  title,
  text,
  lang: 'en',
  source,
});

const PLACE_FACTS: readonly Fact[] = [
  {
    kind: 'number',
    id: 'grap-stage-order',
    title: 'Highest GRAP stage left in force in Delhi NCR by the CAQM order of 17 Nov 2026',
    value: 2,
    range: null,
    unit: 'stage',
    source: GRAP_ORDER,
  },
  quote(
    [
      'grap-order-text',
      'GRAP stages left in force by the CAQM order of 17 Nov 2026',
      'Actions under Stage-I & II shall, however, remain invoked and be implemented as per the modified GRAP dated 29.09.2026, monitored and reviewed by all the agencies concerned in the entire NCR',
    ],
    GRAP_ORDER,
  ),
  quote(
    [
      'ncr-districts',
      'Districts of the National Capital Region',
      'The NCR as notified covers the whole of NCT-Delhi and certain districts of Haryana, Uttar Pradesh and Rajasthan. Haryana: Faridabad, Gurugram, Nuh, Rohtak, Sonepat, Rewari, Jhajjhar, Panipat, Palwal, Bhiwani, Charkhi Dadri, Mahendragarh, Jind and Karnal. Uttar Pradesh: Meerut, Ghaziabad, Gautam Budh Nagar, Bulandshahr, Baghpat, Hapur, Shamli and Muzaffarnagar. Rajasthan: Alwar and Bharatpur. Delhi: Whole of NCT Delhi.',
    ],
    NCR_AREAS,
  ),
];

const CREDITS: readonly Fact[] = [
  quote(
    [
      'credit-cpcb',
      'Credit for station readings',
      'Station readings: Central Pollution Control Board, CAAQMS hourly feed.',
    ],
    CPCB_FEED,
  ),
  quote(
    [
      'credit-data-gov-in',
      'Credit for station readings through data.gov.in',
      'Central Pollution Control Board, 2016, Real time Air Quality Index from various locations, Open Government Data Platform India, updated hourly, https://www.data.gov.in/resource/real-time-air-quality-index-various-locations. Published under Government Open Data License - India: https://www.data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf.',
    ],
    GODL_INDIA,
  ),
  quote(
    [
      'data-gov-in-aqi-rule',
      'How the AQI is found on the data.gov.in path',
      "CPCB sub-indices via data.gov.in. AQI is the highest sub-index, CPCB's own rule.",
    ],
    DATA_GOV_AQI,
  ),
  quote(['credit-open-meteo', 'Credit for modelled air', 'Weather data by Open-Meteo.com'], OPEN_METEO_AIR),
  quote(
    [
      'credit-cams',
      'Credit for the air quality model',
      'Modelled air quality: CAMS global forecast of the Copernicus Atmosphere Monitoring Service, through Open-Meteo.',
    ],
    OPEN_METEO_AIR,
  ),
  quote(
    [
      'credit-geonames',
      'Credit for PIN locations',
      'PIN locations: GeoNames postal codes, geonames.org, CC BY 4.0.',
    ],
    GEONAMES_POSTAL,
  ),
];

/** Every air fact: NAQI bands, health statements and breakpoints, the GRAP order, the NCR list and credits. */
export const AIR_FACTS: readonly Fact[] = [...NAQI_FACTS, ...PLACE_FACTS, ...CREDITS];
