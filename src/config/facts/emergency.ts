// India's single emergency number, for the fixed reply to an urgent question.
import type { Fact, Source } from '../../lib/types.js';
import { numberFact, quoteFact } from './build.js';

const PIB_ERSS: Source = {
  title: "India's Commitment to Women's Safety, release 2116557",
  publisher: 'Press Information Bureau, Ministry of Women and Child Development',
  url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2116557',
  published: '29 Mar 2025',
  retrieved: '2026-11-27',
};

/** The emergency number and the sentence that states it. */
export const EMERGENCY_FACTS: readonly Fact[] = [
  numberFact(
    {
      id: 'india-emergency-number',
      title: 'Single emergency number for police, fire and health services in India',
      value: 112,
      unit: 'phone number',
    },
    PIB_ERSS,
  ),
  quoteFact(
    {
      id: 'india-emergency-number-quote',
      title: 'What the 112 emergency number covers',
      text: 'The Emergency Response Support System (ERSS) is an integrated emergency service launched by the Government of India with a single emergency number – 112 to handle all types of emergencies.',
    },
    PIB_ERSS,
  ),
];
