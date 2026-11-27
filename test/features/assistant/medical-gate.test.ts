// The medical gate test set: questions in English, Hindi and romanised Hindi with the verdict each must get.
// Planning questions about a member with a condition reach the planner; symptoms, medicines, doses and diagnosis do not.
import { describe, expect, it } from 'vitest';
import {
  fixedMedicalReply,
  medicalGate,
  mentionsMedicine,
  mentionsTreatment,
  type MedicalVerdict,
} from '../../../src/features/assistant/medical-gate.js';

const english: readonly (readonly [string, MedicalVerdict])[] = [
  ['What dose of inhaler should she take?', 'medical'],
  ['How many puffs of salbutamol can my son take before football?', 'medical'],
  ['Can I give my daughter paracetamol for the cough?', 'medical'],
  ['My father has chest tightness, what medicine should he take?', 'medical'],
  ['Is this cough from pollution or is it asthma?', 'medical'],
  ['Does my son have asthma? He wheezes at night.', 'medical'],
  ['What are the symptoms of smog poisoning?', 'medical'],
  ['Which antihistamine is best for smog allergy?', 'medical'],
  ['Should I use a nebuliser for my baby?', 'medical'],
  ['Is montelukast safe for children?', 'medical'],
  ['My eyes are burning and I have a headache, what should I do?', 'medical'],
  ['Can steam inhalation clear my lungs?', 'medical'],
  ['What is a good home remedy for a sore throat from smog?', 'medical'],
  ['How do I treat my mother when she gets breathless?', 'medical'],
  ['Is it pneumonia if the fever does not go away?', 'medical'],
  ['What dosage of vitamin C helps with air pollution?', 'medical'],
  ['Should I take my child to the doctor for this wheezing?', 'medical'],
  ['Can pollution cause cancer?', 'medical'],
  ['Is an SpO2 of 92 normal for my grandmother?', 'medical'],
  ['She uses an inhaler, can she run at 7?', 'medical'],
  ['My son has a cold, can he go to school?', 'medical'],
  ['Grandpa feels unwell after the walk, is that the smog?', 'medical'],
  ['My son cannot breathe properly right now', 'emergency'],
  ['Grandma has chest pain and is struggling to breathe', 'emergency'],
  ["My baby's lips are turning blue", 'emergency'],
  ['He fainted after coming back from his walk', 'emergency'],
  ['She is having a severe asthma attack, what do I do?', 'emergency'],
  ['My father collapsed and is not responding', 'emergency'],
  ['My child is gasping for air', 'emergency'],
  ['My daughter has asthma, can she play football at 6?', null],
  ['Can my father with a heart condition go for his morning walk at 7?', null],
  ['Is it safe for my pregnant wife to walk to the market?', null],
  ['Should we keep the windows closed tonight?', null],
  ['When is the best time to dry clothes outside?', null],
  ['Should my son wear an N95 mask to school?', null],
  ['Can we go to the park in the evening instead?', null],
  ['Will running the purifier in the bedroom help?', null],
  ['Does cycling to work raise my inhaled dose today?', null],
  ['Is the metro better than driving today?', null],
  ['My grandmother has COPD, should she skip the temple visit?', null],
  ['Can the kids play outside after school?', null],
  ['Should I cancel the morning jog?', null],
  ['How much does carpooling cut our CO2?', null],
  ['Is it okay to burn incense in the evening?', null],
  ['Is the AQI in Delhi dangerous for kids?', null],
  ['What does the temperature drop tonight mean for the air?', null],
];

const hindi: readonly (readonly [string, MedicalVerdict])[] = [
  ['उसे इनहेलर की कितनी खुराक देनी चाहिए?', 'medical'],
  ['बच्चे को खांसी है, कौन सी दवा दूं?', 'medical'],
  ['मेरी आंखों में जलन और सिरदर्द है, क्या करूं?', 'medical'],
  ['क्या यह अस्थमा है या प्रदूषण की वजह से खाँसी है?', 'medical'],
  ['दादी को बुखार है, कौन सी गोली लें?', 'medical'],
  ['गले में खराश के लिए कोई घरेलू नुस्खा बताइए', 'medical'],
  ['पापा को सांस फूलने की दिक्कत है, क्या इलाज है?', 'medical'],
  ['क्या बच्चे को डॉक्टर को दिखाना चाहिए?', 'medical'],
  ['मेरे बेटे को सांस नहीं आ रही है', 'emergency'],
  ['दादाजी के सीने में दर्द है', 'emergency'],
  ['बच्चा बेहोश हो गया', 'emergency'],
  ['उसके होंठ नीले पड़ गए हैं', 'emergency'],
  ['मेरी बेटी को अस्थमा है, क्या वह शाम 6 बजे फुटबॉल खेल सकती है?', null],
  ['क्या आज सुबह टहलने जाना ठीक है?', null],
  ['क्या खिड़कियां बंद रखनी चाहिए?', null],
  ['मेट्रो से जाना बेहतर है या कार से?', null],
  ['गर्भवती पत्नी के लिए बाजार का चक्कर लगाना सुरक्षित है?', null],
  ['क्या दिल की बीमारी वाले दादाजी शाम को बाहर बैठ सकते हैं?', null],
];

const romanised: readonly (readonly [string, MedicalVerdict])[] = [
  ['bachche ko khansi hai, kaun si dawai dein?', 'medical'],
  ['inhaler ki kitni khurak deni chahiye?', 'medical'],
  ['dadi ko bukhar hai kya karein', 'medical'],
  ['aankhon mein jalan ho rahi hai', 'medical'],
  ['gale mein kharash ka gharelu nuskha batao', 'medical'],
  ['papa ki saans phool rahi hai, kya ilaj hai?', 'medical'],
  ['beta saans nahi le pa raha', 'emergency'],
  ['dadaji ke seene mein dard ho raha hai', 'emergency'],
  ['bacha behosh ho gaya', 'emergency'],
  ['meri beti ko asthma hai, kya woh shaam 6 baje football khel sakti hai?', null],
  ['kya aaj subah walk pe jana theek hai?', null],
  ['khidkiyan band rakhein kya?', null],
  ['metro se jaana behtar hai ya car se?', null],
  ['kya bachche school ke baad bahar khel sakte hain?', null],
];

describe('medicalGate', () => {
  it('has a test set of at least 60 phrases across the three scripts', () => {
    expect(english.length + hindi.length + romanised.length).toBeGreaterThanOrEqual(60);
    expect(hindi.length).toBeGreaterThanOrEqual(15);
    expect(romanised.length).toBeGreaterThanOrEqual(12);
  });

  it.each([...english, ...hindi, ...romanised])('%s -> %s', (question, verdict) => {
    expect(medicalGate(question)).toBe(verdict);
  });

  it('reads letters in any case and in composed or decomposed Unicode', () => {
    expect(medicalGate('WHAT DOSE SHOULD SHE TAKE')).toBe('medical');
    expect(medicalGate('ज़ुकाम है'.normalize('NFD'))).toBe('medical');
  });
});

describe('mentionsMedicine', () => {
  it('finds medicines and doses in model text but not exposure wording', () => {
    expect(mentionsMedicine('Give her two puffs of her inhaler first.')).toBe(true);
    expect(mentionsMedicine('उसे दवा दें।')).toBe(true);
    expect(mentionsMedicine('Cycling raises the inhaled dose on a bad day.')).toBe(false);
    expect(mentionsMedicine('If she coughs, ask a doctor.')).toBe(false);
  });
});

describe('mentionsTreatment', () => {
  it('finds medicines, symptoms, emergency signs and remedies in an answer, but lets a referral to a doctor through', () => {
    expect(mentionsTreatment('Give her two puffs of her inhaler first.')).toBe(true);
    expect(mentionsTreatment('If he starts coughing, stop the game.')).toBe(true);
    expect(mentionsTreatment('If her lips look blue, act fast.')).toBe(true);
    expect(mentionsTreatment('Steam twice a day helps.')).toBe(true);
    expect(mentionsTreatment('गरारे करें और अदरक लें।')).toBe(true);
    expect(mentionsTreatment('Give him M\u{043E}ntair tonight.')).toBe(true);
    expect(mentionsTreatment('Move the walk to 15:00. Ask a doctor about her heart condition.')).toBe(false);
    expect(mentionsTreatment('Cycling raises the inhaled dose on a bad day.')).toBe(false);
  });
});

describe('fixedMedicalReply', () => {
  it('tells the person to ask a doctor and adds the advice for the band when the band is known', () => {
    const reply = fixedMedicalReply('medical', 'en', 'very_poor');
    expect(reply.text).toMatch(
      /^This app does not advise on symptoms, medicines, doses or diagnosis\. Please ask a doctor\. /,
    );
    expect(reply.text).toContain('"Remain indoors and keep activity levels low"');
    expect(reply.factIds).toContain('advice-very-poor-vulnerable');
    expect(reply.facts).toEqual([]);
    expect(fixedMedicalReply('medical', 'hi', 'very_poor').text).toMatch(/डॉक्टर.*। बहुत खराब हवा के लिए/);
    const unknown = fixedMedicalReply('medical', 'en', null);
    expect(unknown.text).toMatch(/doctor\.$/);
    expect(unknown.factIds).toEqual([]);
  });

  it('gives an emergency variant that says to get care now, in both languages, with the number as a fact', () => {
    const reply = fixedMedicalReply('emergency', 'en', 'severe');
    expect(reply.text).toMatch(/now/);
    expect(reply.text).toMatch(/112/);
    expect(reply.factIds).toEqual(['india-emergency-number']);
    expect(reply.facts.map((fact) => [fact.id, fact.value])).toEqual([['india-emergency-number', 112]]);
    expect(fixedMedicalReply('emergency', 'hi', null).text).toMatch(/तुरंत/);
  });
});
