// Mask facts: what N95s filter when worn, how much leaks in around a poor fit, cloth masks and children.
import type { Fact } from '../../lib/types.js';
import { numberFact, quoteFact } from './build.js';
import { CHERRIE_2018, SHAKYA_2017, SMART_2020, TOMKINS_2025 } from './studies.js';

/** Mask findings, each with its source. */
export const MASK_FACTS: readonly Fact[] = [
  numberFact(
    {
      id: 'mask-n95-filtered',
      title: 'Share of particles filtered, N95 and CaN99 together, worn in a lab test',
      value: 0.97,
      unit: 'share',
    },
    TOMKINS_2025,
    { low: 0.97, high: 0.98 },
  ),
  quoteFact(
    {
      id: 'mask-filtration-quote',
      title: 'Filtration of cloth masks, medical masks and respirators when worn',
      text: 'Filtration efficiency for the cloth mask was 47-55%, for level 1 masks 52-60%, for level 3 masks 60-77%. A non-certified KN95 look-alike, two KF94s, and three KN95s filtered 57-77%, and the N95 and CaN99 97-98% without fit testing.',
    },
    TOMKINS_2025,
  ),
  numberFact(
    {
      id: 'mask-leakage',
      title: 'Share of diesel black carbon that leaked into 4 mask types worn at rest, chamber test',
      value: 0.03,
      unit: 'share',
    },
    CHERRIE_2018,
    { low: 0.03, high: 0.68 },
  ),
  quoteFact(
    {
      id: 'mask-leakage-quote',
      title: 'How much leaked into masks sold in Beijing, and why',
      text: 'In the volunteer tests, the average total inward leakage (TIL) of BC ranged from 3% to 68% in the sedentary tests and from 7% to 66% in the active tests. Only one mask type tested showed an average TIL of less than 10%, under both test conditions. [...] Many commercially available face masks may not provide adequate protection, primarily due to poor facial fit.',
    },
    CHERRIE_2018,
  ),
  quoteFact(
    {
      id: 'mask-cloth-quote',
      title: 'Cloth masks against particles under 2.5 μm, laboratory test',
      text: 'our results suggest that cloth masks are only marginally beneficial in protecting individuals from particles<2.5 μm.',
    },
    SHAKYA_2017,
  ),
  quoteFact(
    {
      id: 'mask-children-quote',
      title: "Children's masks were studied for wearability, not filtration",
      text: 'In this pilot study, we assess the perceived wearability of three facemasks (Vogmask, TuHao and ReSpimask) marketed in the UK as being designed to protect children against exposure to air pollution.',
    },
    SMART_2020,
  ),
];
