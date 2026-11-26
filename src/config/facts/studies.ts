// Peer reviewed studies behind the mask, purifier, plant and indoor smoke facts.
import type { Source } from '../../lib/types.js';

function study(title: string, url: string, journal: { publisher: string; published: string }): Source {
  return { title, url, ...journal, retrieved: '2026-11-24' };
}

/** Fitted filtration of cloth masks, medical masks and respirators. */
export const TOMKINS_2025: Source = study(
  'Measuring the fitted filtration efficiency of cloth masks, medical masks and respirators, doi 10.1371/journal.pone.0301310',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC12011288/',
  { publisher: 'PLoS One', published: '2025' },
);

/** Masks worn by volunteers in Beijing, and how much leaks in. */
export const CHERRIE_2018: Source = study(
  'Effectiveness of face masks used to protect Beijing residents against particulate air pollution, doi 10.1136/oemed-2017-104765',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC5969371/',
  { publisher: 'Occupational and Environmental Medicine', published: '2018' },
);

/** Cloth masks against fine particles. */
export const SHAKYA_2017: Source = study(
  'Evaluating the efficacy of cloth facemasks in reducing particulate matter exposure, doi 10.1038/jes.2016.42',
  'https://doi.org/10.1038/jes.2016.42',
  { publisher: 'Journal of Exposure Science and Environmental Epidemiology', published: '2017' },
);

/** Children's masks, studied for wearability only. */
export const SMART_2020: Source = study(
  'Assessment of the Wearability of Facemasks against Air Pollution in Primary School-Aged Children in London, doi 10.3390/ijerph17113935',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC7312046/',
  { publisher: 'International Journal of Environmental Research and Public Health', published: '2020' },
);

/** Air purifiers in Delhi homes in winter. */
export const VYAS_2016: Source = study(
  'An Experiment with Air Purifiers in Delhi during Winter 2015-2016, doi 10.1371/journal.pone.0167999',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC5158316/',
  { publisher: 'PLoS One', published: '2016' },
);

/** Potted plants and indoor air. */
export const CUMMINGS_2020: Source = study(
  'Potted plants do not improve indoor air quality: a review and analysis of reported VOC removal efficiencies, doi 10.1038/s41370-019-0175-9',
  'https://doi.org/10.1038/s41370-019-0175-9',
  { publisher: 'Journal of Exposure Science and Environmental Epidemiology', published: '2020' },
);

/** Mosquito coil smoke. */
export const LIU_2003: Source = study(
  'Mosquito coil emissions and health implications, doi 10.1289/ehp.6286',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC1241646/',
  { publisher: 'Environmental Health Perspectives', published: '2003' },
);

/** Incense smoke. */
export const JETTER_2002: Source = study(
  'Characterization of emissions from burning incense, doi 10.1016/s0048-9697(02)00043-8',
  'https://doi.org/10.1016/s0048-9697(02)00043-8',
  { publisher: 'Science of the Total Environment', published: '2002' },
);

/** PM2.5 measured in Indian homes that cook with solid fuel. */
export const BALAKRISHNAN_2013: Source = study(
  'State and national household concentrations of PM2.5 from solid cookfuel use: results from measurements and modeling in India for estimation of the global burden of disease, doi 10.1186/1476-069x-12-77',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC3851863/',
  { publisher: 'Environmental Health', published: '2013' },
);
