// The medical gate: a rule based check that runs before any model call on a question, in English, Hindi and
// romanised Hindi, and the check of model answers for medical advice. A hit gets a fixed reply written in code.
import type { FactValue, Language } from '../../lib/types.js';
import type { AqiBand } from '../naqi/types.js';
import REPLIES from './replies.json' with { type: 'json' };
import { cited } from '../planner/fact-values.js';
import { bandAdvice } from './band-advice.js';
import { foldDevanagari, readForMatching } from './lookalikes.js';
import {
  CARE_TERMS,
  EMERGENCY_TERMS,
  MEDICAL_TERMS,
  MEDICINE_TERMS,
  TREATMENT_TERMS,
  type Terms,
} from './medical-terms.js';

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
  const hindi = terms.devanagari.map((term) => `(?<![\\p{L}\\p{M}])${term}`);
  return new RegExp(foldDevanagari([...terms.latin, ...hindi].join('|')), 'iu');
};

const EMERGENCY = compile(EMERGENCY_TERMS);
const MEDICINE = compile(MEDICINE_TERMS);
const MEDICAL = compile(MEDICAL_TERMS);
const CARE = compile(CARE_TERMS);
const TREATMENT = compile(TREATMENT_TERMS);

/**
 * The text as the gate reads it, twice: with runs of three or more of a letter cut to two, and with every double
 * letter cut to one, so a stretched or doubled spelling such as coughhing still matches.
 */
function readings(text: string): string[] {
  const read = readForMatching(text).replace(/(\p{L})\1{2,}/gu, '$1$1');
  return [read, read.replace(/(\p{L})\1/gu, '$1')];
}

const anyMatch = (text: string, patterns: readonly RegExp[]): boolean =>
  readings(text).some((reading) => patterns.some((pattern) => pattern.test(reading)));

/** Sorts a question before any model call. Emergencies come first so the urgent reply always wins. */
export function medicalGate(question: string): MedicalVerdict {
  if (anyMatch(question, [EMERGENCY])) {
    return 'emergency';
  }
  return anyMatch(question, [MEDICINE, MEDICAL, CARE, TREATMENT]) ? 'medical' : null;
}

/** True when text names a medicine, a device or a dose. */
export function mentionsMedicine(text: string): boolean {
  return anyMatch(text, [MEDICINE]);
}

/**
 * True when a model answer gives medical advice of any kind: a medicine or dose, a symptom or an emergency sign,
 * or a treatment or home remedy. Telling someone to ask a doctor is not advice and passes.
 */
export function mentionsTreatment(text: string): boolean {
  return anyMatch(text, [EMERGENCY, MEDICINE, MEDICAL, TREATMENT]);
}

const TEXTS: Readonly<Record<FixedReply['kind'], Readonly<Record<Language, string>>>> = REPLIES;

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
