// The medical gate: a rule based check that runs before any model call on a question, in English, Hindi and
// romanised Hindi. A hit gets a fixed reply written in code and the model is never asked.
import type { FactValue, Language } from '../../lib/types.js';
import type { AqiBand } from '../naqi/types.js';
import { cited } from '../planner/fact-values.js';
import { bandAdvice } from './band-advice.js';
import { EMERGENCY_TERMS, MEDICAL_TERMS, MEDICINE_TERMS, type Terms } from './medical-terms.js';

/** emergency means get care now; medical means symptoms, medicines, doses or diagnosis; null means planning. */
export type MedicalVerdict = 'emergency' | 'medical' | null;

/**
 * The reply written in code for a medical question, with the health ministry advice for the band added to a
 * medical reply. factIds name the facts the text relies on; facts are the numbers it states, with their labels.
 */
export interface FixedReply {
  readonly kind: 'emergency' | 'medical';
  readonly text: string;
  readonly factIds: readonly string[];
  readonly facts: readonly FactValue[];
}

const compile = (terms: Terms): RegExp => {
  const hindi = terms.devanagari.split('|').map((term) => `(?<![\\p{L}\\p{M}])${term}`);
  return new RegExp([...terms.latin, ...hindi].join('|').normalize('NFKC'), 'iu');
};

const EMERGENCY = compile(EMERGENCY_TERMS);
const MEDICINE = compile(MEDICINE_TERMS);
const MEDICAL = compile(MEDICAL_TERMS);

const read = (text: string): string => text.normalize('NFKC').replace(/[‘’]/gu, "'");

/** Sorts a question before any model call. Emergencies come first so the urgent reply always wins. */
export function medicalGate(question: string): MedicalVerdict {
  const text = read(question);
  if (EMERGENCY.test(text)) {
    return 'emergency';
  }
  return MEDICINE.test(text) || MEDICAL.test(text) ? 'medical' : null;
}

/** True when text names a medicine, a device or a dose. Model answers that do are rejected. */
export function mentionsMedicine(text: string): boolean {
  return MEDICINE.test(read(text));
}

const TEXTS: Readonly<Record<FixedReply['kind'], Readonly<Record<Language, string>>>> = {
  medical: {
    en: 'This app does not advise on symptoms, medicines, doses or diagnosis. Please ask a doctor.',
    hi: 'यह ऐप लक्षण, दवा, खुराक या बीमारी की पहचान पर सलाह नहीं देता। कृपया डॉक्टर से पूछें।',
  },
  emergency: {
    en: 'This sounds urgent. If someone is struggling to breathe, has chest pain, has blue or grey lips or has fainted, get medical help now. Call 112 or go to the nearest hospital.',
    hi: 'यह आपात स्थिति लगती है। अगर किसी को साँस लेने में बहुत तकलीफ़ है, सीने में दर्द है, होंठ नीले पड़ रहे हैं या वह बेहोश हो गया है, तो तुरंत चिकित्सा सहायता लें। 112 पर कॉल करें या नज़दीकी अस्पताल जाएँ।',
  },
};

const EMERGENCY_NUMBER = 'india-emergency-number';

/**
 * The fixed reply for a verdict, in the language asked for. A medical reply ends with the health ministry advice
 * for the band when the band is known. An emergency reply states the emergency number from its fact.
 */
export function fixedMedicalReply(
  kind: FixedReply['kind'],
  language: Language,
  band: AqiBand | null,
): FixedReply {
  if (kind === 'emergency') {
    return {
      kind,
      text: TEXTS.emergency[language],
      factIds: [EMERGENCY_NUMBER],
      facts: cited(EMERGENCY_NUMBER),
    };
  }
  const advice = band === null ? null : bandAdvice(band, language);
  const text = advice === null ? TEXTS.medical[language] : `${TEXTS.medical[language]} ${advice.text}`;
  return { kind, text, factIds: advice?.factIds ?? [], facts: [] };
}
