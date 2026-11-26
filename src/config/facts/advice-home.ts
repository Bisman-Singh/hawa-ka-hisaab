// Health ministry advice for the home and for travel, quoted word for word from the same advisory.
import type { Fact } from '../../lib/types.js';
import { quoteFact } from './build.js';
import { ADVISORY } from './sources.js';

/** Advice on airing rooms, cleaning, masks, purifiers, indoor smoke and car air conditioning. */
export const HOME_ADVICE_FACTS: readonly Fact[] = [
  quoteFact(
    {
      id: 'advice-ventilate',
      title: 'Health ministry advice on outdoor exercise and opening windows on poor to severe days',
      text: 'Avoid outdoor morning and late evening walk, run, jog and physical exercise, Do not open external doors and windows during morning and late evening hours, it may ventilate if necessary, between 12 p.m. to 4 p.m. in afternoon (Days with poor to severe AQI)',
    },
    ADVISORY,
  ),
  quoteFact(
    {
      id: 'advice-wet-mopping',
      title: 'Health ministry advice on cleaning floors',
      text: 'Practice wet mopping instead of sweeping or vacuum inside homes to reduce exposure to air pollution.',
    },
    ADVISORY,
  ),
  quoteFact(
    {
      id: 'advice-masks',
      title: 'Health ministry advice on face masks',
      text: "If you choose to use face mask, the disposable N95 or N99 is useful provided user instructions are followed. These masks may help provided the period of exposure is short. Masks should have proper fitting on users' mouth and nose. Ensure to replace the masks after usage as instructed. Paper masks, handkerchiefs, scarves and cloth are not effective.",
    },
    ADVISORY,
  ),
  quoteFact(
    {
      id: 'advice-purifier-days',
      title: 'Health ministry advice on when air purifiers may help',
      text: 'On days of poor to severe plus air pollution (AQI>200) use of air purifiers may be beneficial to reduce the effects of air pollution.',
    },
    ADVISORY,
  ),
  quoteFact(
    {
      id: 'advice-purifier-ozone',
      title: 'Health ministry advice against ozone generating purifiers',
      text: 'Avoid using an air purifier that works by generating ozone, as it increases pollution inside rooms.',
    },
    ADVISORY,
  ),
  quoteFact(
    {
      id: 'advice-coils-incense',
      title: 'Health ministry advice on mosquito coils and incense',
      text: 'Avoid burning mosquito coils and incense sticks in closed premises.',
    },
    ADVISORY,
  ),
  quoteFact(
    {
      id: 'advice-clean-fuel',
      title: 'Health ministry advice on cooking and heating fuel',
      text: 'Avoid burning biomass such as wood, coal, animal dung, kerosene. Use clean smokeless fuels (gas or electricity) for cooking and heating purposes. If using biomass, use clean cook stoves.',
    },
    ADVISORY,
  ),
  quoteFact(
    {
      id: 'advice-no-smoking',
      title: 'Health ministry advice on smoking',
      text: 'Do not smoke cigarettes, bidis and related tobacco products.',
    },
    ADVISORY,
  ),
  quoteFact(
    {
      id: 'advice-ac-recirculate',
      title: 'Health ministry advice on air conditioners in buildings and vehicles',
      text: 'When operating air conditioners in buildings or vehicle, use in "re-circulate" mode to avoid contact with outside air.',
    },
    ADVISORY,
  ),
];
