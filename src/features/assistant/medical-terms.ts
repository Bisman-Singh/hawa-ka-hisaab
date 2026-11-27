// The phrases the medical gate looks for, from medical-terms.json. A condition alone, such as asthma, is not one:
// those are planning questions. Text is normalised before matching, so one spelling of each is enough.
import TERMS from './medical-terms.json' with { type: 'json' };

/** Terms for one verdict: regular expressions for English and romanised Hindi, and Hindi phrases. */
export interface Terms {
  readonly latin: readonly string[];
  readonly devanagari: readonly string[];
}

/** Signs of an emergency: the reply says to get care now. */
export const EMERGENCY_TERMS: Terms = TERMS.emergency;

/** Medicines, devices and doses, with the brand names Indian households use. Model answers are checked too. */
export const MEDICINE_TERMS: Terms = TERMS.medicine;

/** Symptoms, illness and diagnosis. Model answers are checked against these too. */
export const MEDICAL_TERMS: Terms = TERMS.medical;

/** Asking for care, which a question may do; a model answer that tells someone to ask a doctor is fine. */
export const CARE_TERMS: Terms = TERMS.care;

/** Treatment and home remedies, which only a doctor should advise on. Model answers are checked against these. */
export const TREATMENT_TERMS: Terms = TERMS.treatment;
