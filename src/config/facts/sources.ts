// The public documents behind the household facts, each with a link a reader can open.
import type { Source } from '../../lib/types.js';

const RETRIEVED = '2026-11-23';

/** Health ministry advisory on air pollution, the source of all advice wording. */
export const ADVISORY: Source = {
  title: 'Health Advisory on Air Pollution under NPCCHH, D.O. dated 01.11.2025',
  publisher: 'Ministry of Health and Family Welfare, Government of India',
  url: 'https://ncdc.mohfw.gov.in/uploads/pdf/air2.pdf',
  published: '2025-11-01',
  retrieved: RETRIEVED,
};

/** Delhi study of PM2.5 in each way of travelling, with breathing rates per mode. */
export const GOEL_2015: Source = {
  title:
    'On-road PM2.5 pollution exposure in multiple transport microenvironments in Delhi, Atmospheric Environment 123, 2015',
  publisher: 'Goel, Gani, Guttikunda, Wilson and Tiwari',
  url: 'https://urbanemissions.info/wp-content/uploads/docs/2015-12-AE-Delhi-On-Road-Exposures.pdf',
  published: '2015',
  retrieved: RETRIEVED,
};

/** EPA breathing rates by age and effort. */
export const EPA_BREATHING: Source = {
  title: 'Exposure Factors Handbook 2011, chapter 6, Table 6-2',
  publisher: 'US Environmental Protection Agency',
  url: 'https://www.epa.gov/sites/default/files/2015-09/documents/efh-chapter06.pdf',
  published: 'September 2011',
  retrieved: RETRIEVED,
};

/** EPA guide that sizes air cleaners by room area. */
export const EPA_AIR_CLEANERS: Source = {
  title: 'Guide to Air Cleaners in the Home',
  publisher: 'US Environmental Protection Agency',
  url: 'https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home',
  published: null,
  retrieved: RETRIEVED,
};

/** NIST conversion factors, for cubic feet per minute. */
export const NIST_UNITS: Source = {
  title:
    'NIST Guide to the SI, Appendix B.9: Factors for units listed by kind of quantity or field of science',
  publisher: 'National Institute of Standards and Technology',
  url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9',
  published: null,
  retrieved: '2026-11-26',
};

/** India GHG Program factors for road vehicles and city buses. */
export const GHG_ROAD: Source = {
  title:
    'India Specific Road Transport Emission Factors, version 1.0, for stakeholder consultation, tables without the 10% uplift column',
  publisher: 'India GHG Program',
  url: 'https://indiaghgp.org/sites/default/files/Road%20Transport%20Technical%20Paper.pdf',
  published: '2015',
  retrieved: RETRIEVED,
};

/** India GHG Program factors for rail. */
export const GHG_RAIL: Source = {
  title: 'India Specific Rail Transport Emission Factors, version 1.0, for stakeholder consultation',
  publisher: 'India GHG Program',
  url: 'https://indiaghgp.org/sites/default/files/Rail%20Transport%20Emission.pdf',
  published: '2015',
  retrieved: RETRIEVED,
};
