// Indoor facts: purifier sizing, indoor smoke sources and the corrections of common beliefs.
import type { Fact } from '../../lib/types.js';
import { numberFact, quoteFact } from './build.js';
import { EPA_AIR_CLEANERS, NIST_UNITS } from './sources.js';
import { BALAKRISHNAN_2013, CUMMINGS_2020, JETTER_2002, LIU_2003, VYAS_2016 } from './studies.js';

/** Sizing, smoke sources and myth corrections, each with its source. */
export const INDOOR_FACTS: readonly Fact[] = [
  numberFact(
    {
      id: 'purifier-cadr-per-area',
      title: 'Smallest air cleaner CADR for a room with an 8 ft ceiling, per 100 sq ft of floor',
      value: 65,
      unit: 'cfm per 100 sq ft',
    },
    EPA_AIR_CLEANERS,
  ),
  numberFact(
    {
      id: 'unit-cfm-m3h',
      title: 'One cubic foot per minute in cubic metres per hour, from 4.719474E-04 cubic metres per second',
      value: 1.69901,
      unit: 'm3/h per cfm',
    },
    NIST_UNITS,
  ),
  numberFact(
    {
      id: 'coil-cigarettes',
      title: 'PM2.5 from one mosquito coil, in cigarettes',
      value: 75,
      unit: 'cigarettes',
    },
    LIU_2003,
    { low: 75, high: 137 },
  ),
  quoteFact(
    {
      id: 'coil-quote',
      title: 'Mosquito coil smoke against cigarettes',
      text: 'burning one mosquito coil would release the same amount of PM(2.5) mass as burning 75-137 cigarettes.',
    },
    LIU_2003,
  ),
  quoteFact(
    {
      id: 'incense-quote',
      title: 'PM2.5 given off by burning incense',
      text: 'Emission rates for PM2.5 (particulate matter less than 2.5 microm in aerodynamic diameter) ranged from 7 to 202 mg/h, and PM2.5 emission factors ranged from 5 to 56 mg/g of incense burned.',
    },
    JETTER_2002,
  ),
  quoteFact(
    {
      id: 'solid-fuel-quote',
      title: 'PM2.5 measured in Indian homes that cook with solid fuel',
      text: 'The measured mean 24-hr concentration of PM2.5 in solid cookfuel using households ranged from 163 μg/m3 ... in the living area to 609 μg/m3 ... in the kitchen area.',
    },
    BALAKRISHNAN_2013,
  ),
  quoteFact(
    {
      id: 'purifier-limits-quote',
      title: 'What purifiers did in Delhi homes in winter',
      text: 'although the most affordable air purifiers currently available are associated with significant improvements in the indoor environment, they are not a replacement for public action in regions like Delhi.',
    },
    VYAS_2016,
  ),
  quoteFact(
    {
      id: 'plants-quote',
      title: 'How many potted plants it would take to matter',
      text: "necessitating the placement of 10-1000 plants/m2 of a building's floor space for the combined VOC-removing ability by potted plants to achieve the same removal rate that outdoor-to-indoor air exchange already provides in typical buildings",
    },
    CUMMINGS_2020,
  ),
];
