// Public documents behind the air facts: CPCB, Open-Meteo, GeoNames, CAQM and the NCR Planning Board.
import type { Source } from '../../../lib/types.js';

type Entry = readonly [
  title: string,
  publisher: string,
  url: string,
  published: string | null,
  retrieved: string,
];

const source = ([title, publisher, url, published, retrieved]: Entry): Source => ({
  title,
  publisher,
  url,
  published,
  retrieved,
});

/** CPCB's final report on the index, with the breakpoint table and the health statements. */
export const NAQI_REPORT = source([
  'National Air Quality Index, final report of the Expert Group, Tables 3.11 and 3.12',
  'Central Pollution Control Board',
  'https://cpcb.gov.in/displaypdf.php?id=bmF0aW9uYWwtYWlyLXF1YWxpdHktaW5kZXgvRklOQUwtUkVQT1JUX0FRSV8ucGRm',
  '2014',
  '2026-11-23',
]);

/** CPCB's one page summary of the index, with the worked example and the averaging periods. */
export const ABOUT_AQI = source([
  'About National Air Quality Index',
  'Central Pollution Control Board',
  'https://cpcb.gov.in/displaypdf.php?id=bmF0aW9uYWwtYWlyLXF1YWxpdHktaW5kZXgvQWJvdXRfQVFJLnBkZg==',
  null,
  '2026-11-23',
]);

/** The CPCB station feed the station path reads. */
export const CPCB_FEED = source([
  'CAAQMS hourly air quality index feed',
  'Central Pollution Control Board',
  'https://airquality.cpcb.gov.in/caaqms/rss_feed',
  null,
  '2026-11-26',
]);

/** The data.gov.in copy of the CPCB data, used when the feed cannot be reached. Published under GODL India. */
export const DATA_GOV_AQI = source([
  'Real time Air Quality Index from various locations',
  'Central Pollution Control Board, through the Open Government Data Platform India',
  'https://www.data.gov.in/resource/real-time-air-quality-index-various-locations',
  '2016',
  '2026-11-26',
]);

/** The Government Open Data License India, under which the data.gov.in copy is published. */
export const GODL_INDIA = source([
  'Government Open Data License India, Gazette notification',
  'Ministry of Electronics and Information Technology',
  'https://www.data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf',
  null,
  '2026-11-23',
]);

/** The Open-Meteo air quality service the forecast curve and the modelled path read. */
export const OPEN_METEO_AIR = source([
  'Air Quality API, CAMS global model',
  'Open-Meteo',
  'https://open-meteo.com/en/docs/air-quality-api',
  null,
  '2026-11-26',
]);

/** The GeoNames postal code file the PIN table was built from. */
export const GEONAMES_POSTAL = source([
  'GeoNames postal codes, India, CC BY 4.0',
  'GeoNames',
  'https://download.geonames.org/export/zip/',
  null,
  '2026-11-26',
]);

/** The CAQM GRAP order of 17 Nov 2026. */
export const GRAP_ORDER = source([
  'CAQM order of 17.11.2026 revoking Stage III and intensifying Stages I and II of GRAP',
  'Commission for Air Quality Management in NCR and Adjoining Areas',
  'https://caqm.nic.in/FileUploadDomain/WebsiteDocument/GRAP/GRAP%20Orders/b91570de-8cc1-4735-8879-28f2bc1550f2.pdf',
  '2026-11-17',
  '2026-11-23',
]);

/** The NCR Planning Board page listing the districts of the National Capital Region. */
export const NCR_AREAS = source([
  'NCR Constituent Areas',
  'National Capital Region Planning Board',
  'https://ncrpb.nic.in/ncrconstituent.html',
  'as on April 2018',
  '2026-11-26',
]);
