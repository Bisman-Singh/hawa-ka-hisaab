// Exposure factors: PM2.5 in each way of travelling against the air outside, and breathing rates.
// Ratios are on-road over ambient, from the Delhi study; a ratio of 1.4 means 40 percent above the air outside.
import type { Fact } from '../../lib/types.js';
import { numberFact, quoteFact } from './build.js';
import { EPA_BREATHING, GOEL_2015 } from './sources.js';

const RATIO = 'times the air outside';
const LITRES = 'litres per minute';

function ratio(id: string, title: string, value: number): Fact {
  return numberFact({ id: `exposure-ratio-${id}`, title, value, unit: RATIO }, GOEL_2015);
}

function breathing(id: string, title: string, value: number): Fact {
  return numberFact({ id: `breathing-${id}`, title, value, unit: LITRES }, EPA_BREATHING);
}

/** On-road ratios, breathing rates per mode and effort, and the study's own words. */
export const EXPOSURE_FACTS: readonly Fact[] = [
  ratio('walk', 'PM2.5 while walking on the road, against the air outside', 1.4),
  ratio('cycle', 'PM2.5 while cycling, against the air outside', 1.1),
  ratio('two-wheeler', 'PM2.5 on a motorised two-wheeler, against the air outside', 1.3),
  ratio('auto', 'PM2.5 in an auto rickshaw, against the air outside', 1.3),
  ratio('car-open', 'PM2.5 in a car with windows open, against the air outside', 1.3),
  ratio('car-ac', 'PM2.5 in an air-conditioned car, against the air outside', 0.5),
  ratio('bus', 'PM2.5 in a bus, air-conditioned or windows open, against the air outside', 1.2),
  ratio('metro', 'PM2.5 inside a metro carriage, against the air outside', 0.8),
  numberFact(
    {
      id: 'ventilation-vehicle',
      title: 'Breathing rate used for riding in a vehicle',
      value: 10,
      unit: LITRES,
    },
    GOEL_2015,
  ),
  numberFact(
    { id: 'ventilation-walk', title: 'Breathing rate used for walking', value: 15, unit: LITRES },
    GOEL_2015,
  ),
  numberFact(
    { id: 'ventilation-cycle', title: 'Breathing rate used for cycling', value: 35, unit: LITRES },
    GOEL_2015,
  ),
  numberFact(
    {
      id: 'exposure-cycle-per-km',
      title: 'PM2.5 taken in per km while cycling, against an air-conditioned car',
      value: 9,
      unit: 'times',
    },
    GOEL_2015,
  ),
  quoteFact(
    {
      id: 'exposure-onroad-quote',
      title: 'The Delhi study on PM2.5 in each way of travelling, in its own words',
      text: 'The on-road PM2.5 concentrations exceeded the ambient measurements by an average of 40% for walking, 10% for cycle, 30% for motorised two wheeler (2W), 30% for open-windowed (OW) car, 30% for auto rickshaw, 20% for air-conditioned as well as for OW bus, 20% for bus stop, and 30% for underground metro station. On the other hand, concentrations were lower by 50% inside air-conditioned (AC) car and 20% inside the metro rail carriage.',
    },
    GOEL_2015,
  ),
  quoteFact(
    {
      id: 'exposure-dose-method',
      title: 'How the Delhi study counts what a traveller breathes in',
      text: 'pollution dose, i.e. the mass of pollutant inhaled, is also dependent on the minute ventilation rates (VR), which is a measure of amount of air inhaled per unit time, expressed in litres/minute.',
    },
    GOEL_2015,
  ),
  quoteFact(
    {
      id: 'exposure-cycle-quote',
      title: 'The Delhi study on cycling against an air-conditioned car',
      text: 'After accounting for air inhalation rate and speed of travel, PM2.5 mass uptake per kilometer during cycling is 9 times of AC car, the mode with the lowest exposure.',
    },
    GOEL_2015,
  ),
  breathing('adult-light', 'Adult breathing rate, light effort, age 21 to 30', 12),
  breathing('adult-moderate', 'Adult breathing rate, moderate effort, age 21 to 30', 26),
  breathing('adult-high', 'Adult breathing rate, high effort, age 21 to 30', 50),
  breathing('child-light', 'Child breathing rate, light effort, age 6 to 10', 11),
  breathing('child-moderate', 'Child breathing rate, moderate effort, age 6 to 10', 22),
  breathing('child-high', 'Child breathing rate, high effort, age 6 to 10', 42),
];
