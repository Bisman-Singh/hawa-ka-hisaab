// Facts the community view shows: the advisory quotes, GRAP charter lines, Delhi winter source shares and mask
// findings, each with a public source. This array is the one the facts index reads.
import type { Fact, Source } from '../../lib/types.js';
import { COMMUNITY_ADVICE, counted, quoted, type NumberRow } from './community-advice.js';

const TERI: Source = {
  title: 'Source Apportionment of PM2.5 and PM10 of Delhi NCR for Identification of Major Sources, Table 5.3',
  publisher: 'ARAI and TERI',
  url: 'https://www.teriin.org/sites/default/files/2018-08/Report_SA_AQM-Delhi-NCR_0.pdf',
  published: 'August 2018',
  retrieved: '2026-11-24',
};

const PIB_CHARTER: Source = {
  title: 'CAQM revokes GRAP Stage III in Delhi NCR, release 2337619',
  publisher: 'Press Information Bureau',
  url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2337619',
  published: '17 Nov 2026',
  retrieved: '2026-11-23',
};

const PIB_SCHEDULE: Source = {
  title: 'CAQM approves revised GRAP schedule, release 2316597',
  publisher: 'Press Information Bureau',
  url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2316597',
  published: '29 Sep 2026',
  retrieved: '2026-11-23',
};

const TOMKINS: Source = {
  title: 'Measuring the fitted filtration efficiency of cloth masks, medical masks and respirators',
  publisher: 'PLoS One, Tomkins and others',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12011288/',
  published: '2025',
  retrieved: '2026-11-24',
};

const CHERRIE: Source = {
  title: 'Effectiveness of face masks used to protect Beijing residents against particulate air pollution',
  publisher: 'Occupational and Environmental Medicine, Cherrie and others',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5969371/',
  published: '2018',
  retrieved: '2026-11-24',
};

const SHARES: readonly NumberRow[] = [
  ['community-share-dg-sets', 'DG sets, share of Delhi winter fine particle pollution', 5, '%'],
  ['community-share-refuse-burning', 'Refuse burning, share of Delhi winter fine particle pollution', 3, '%'],
  ['community-share-transport', 'All transport, share of Delhi winter fine particle pollution', 28, '%'],
  ['community-study-winter', 'Winter the Delhi source shares describe', 2016, 'year'],
];

/** Every fact the community view can show, each with a public source. */
export const COMMUNITY_FACTS: readonly Fact[] = [
  ...COMMUNITY_ADVICE,
  ...SHARES.map((row) => counted(TERI, row)),
  counted(TOMKINS, [
    'community-mask-n95-filtration',
    'N95 filtration when worn, no fit test',
    97,
    '% filtered',
    { low: 97, high: 98 },
  ]),
  counted(TOMKINS, [
    'community-mask-cloth-filtration',
    'Cloth mask filtration when worn',
    47,
    '% filtered',
    { low: 47, high: 55 },
  ]),
  counted(CHERRIE, [
    'community-mask-fit-leakage',
    'Inward leakage of retail masks worn at rest',
    3,
    '% leakage',
    { low: 3, high: 68 },
  ]),
  quoted(PIB_CHARTER, [
    'community-grap-charter',
    'GRAP citizen charter, Stages I and II',
    'Do not idle your vehicle, also turn off the engine at red lights. ... Avoid using DG sets except for essential activities. ... Avoid accumulation and open burning of solid waste and biomass.',
  ]),
  quoted(PIB_SCHEDULE, [
    'community-grap-sports',
    'CAQM advisory on sports competitions in NCR',
    'The Advisory reiterates that physical sports competitions scheduled in NCR during November-December should be appropriately rescheduled, keeping in view the air quality trends prevailing in the area, particularly in the interest of protecting the health of students.',
  ]),
];
