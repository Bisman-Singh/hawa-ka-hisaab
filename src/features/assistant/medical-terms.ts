// Phrases the medical gate looks for, as data. A condition alone, such as asthma or a heart condition, is not here:
// those questions are planning questions.

/** Terms for one verdict: regular expressions for English and romanised Hindi, and Hindi phrases split by a bar. */
export interface Terms {
  readonly latin: readonly string[];
  readonly devanagari: string;
}

/** Signs of an emergency: the reply says to get care now. */
export const EMERGENCY_TERMS: Terms = {
  latin: [
    "\\b(can'?t|cannot|can not|unable to|struggling to|not able to) breathe|\\b(not|stopped) breathing\\b",
    '\\b(gasping|choking|chest pain|heart attack|fainted|fainting|passed out|unconscious|collapsed)\\b',
    '\\b(unresponsive|not responding|seizure|(asthma|severe) attack|coughing (up )?blood)\\b',
    '\\bpain in (his|her|my|the) chest\\b|\\b(lips|face|fingers|skin)\\b.{0,20}\\b(blue|grey|gray)\\b',
    '\\b(saa?ns nahi|dum ghut|s(ee|i)ne (mein|me) dard|chh?ati (mein|me) dard|dil ka daura|behosh)',
  ],
  devanagari: 'सांस नहीं|साँस नहीं|दम घुट|सीने में दर्द|छाती में दर्द|दिल का दौरा|बेहोश|होंठ नीले|खून की उल्टी',
};

/** Medicines, devices and doses. Model answers are checked against these too. */
export const MEDICINE_TERMS: Terms = {
  latin: [
    '\\b(medicines?|medications?|meds|tablets?|pills?|capsules?|syrups?|inhalers?|puffers?|nebuli[sz]ers?)\\b',
    '\\b(steroids?|antibiotics?|antihistamines?|paracetamol|ibuprofen|cetirizine|levocetirizine|salbutamol)\\b',
    '\\b(albuterol|asthalin|budecort|montelukast|crocin|dolo|vitamins?|supplements?|eye ?drops|nasal spray)\\b',
    '(?<!(inhaled|exposure|pollution|pollutant|air) )\\b(doses?|dosage|dosing)\\b|\\bmg\\b(?!\\s*/)|\\bpuffs?\\b',
    '\\b(dawai|dawa|davai|goli|khurh?aa?k)\\b',
  ],
  devanagari: 'दवा|गोली|सिरप|इनहेलर|नेबुलाइ|खुराक|ख़ुराक|डोज़',
};

/** Symptoms, diagnosis, treatment and care. */
export const MEDICAL_TERMS: Terms = {
  latin: [
    '\\b(symptoms?|coughs?|coughing|wheez\\w*|breathless\\w*|short(ness)? of breath|sore throat|itchy)\\b',
    '\\b(burning eyes|eyes are burning|watery eyes|headaches?|fever|nausea|vomit\\w*|dizz\\w*|rash|runny nose)\\b',
    '\\b(sneez\\w*|phlegm|mucus|congestion|chest tightness|tight chest|flu|sinus\\w*|sick|unwell|ill)\\b',
    '\\b(has|have|got|caught) a cold\\b|\\bdoes (he|she|my \\w+) have\\b|\\b(what|which) disease\\b',
    '\\b(diagnos\\w*|is (it|this|that) (asthma|pneumonia|an? infection|an? allergy|bronchitis|covid))\\b',
    '\\b(spo2|oxygen (level|saturation)|oximeter|blood test|x-?ray|cancer|pneumonia|bronchitis|tuberculosis)\\b',
    '\\b(infection|treat|treatment|treating|cures?|remed(y|ies)|steam inhalation|kadha|detox|heal)\\b',
    '\\b(doctor|paediatrician|pediatrician|hospital|clinic)\\b',
    '\\b(lakshan|khaa?nsi|kharash|jalan|sir ?dard|bukhaa?r|zukaa?m|jukaa?m|ulti|chakkar aa)\\b',
    '\\b(saa?ns phool|kaun ?si bee?mari|ilaa?j|upchar|nuskh[ae]|daktar|aspataa?l)\\b',
  ],
  devanagari:
    'लक्षण|खांसी|खाँसी|घरघराहट|सांस फूल|साँस फूल|खराश|जलन(?![\\p{L}\\p{M}])|सिरदर्द|सिर दर्द|बुखार|जुकाम|ज़ुकाम|' +
    'नज़ला|उल्टी|चक्कर आ|कौन सी बीमारी|कौनसी बीमारी|इलाज|उपचार|नुस्खा|नुस्खे|काढ़ा|डॉक्टर|अस्पताल',
};
