// Regression set from a security review: ways to write a number, a link or a medical question that the guards
// once missed. Every case here passed the guards before they were hardened; each must now be caught.
import { describe, expect, it } from 'vitest';
import { medicalGate, mentionsTreatment } from '../../../src/features/assistant/medical-gate.js';
import { checkNumbers, collectAllowed } from '../../../src/features/assistant/number-guard.js';
import { findNumerals } from '../../../src/features/assistant/numerals.js';
import { proseProblem } from '../../../src/features/assistant/text-guard.js';

const allowed = collectAllowed([287, 142.6, '07:30', 5, 2]);
const accepted = (text: string): boolean =>
  checkNumbers([text], allowed).passed && proseProblem([text]) === null;

describe('numbers written so the finder could not see them', () => {
  it.each([
    ['dingbat circled digits', 'The AQI is \u{2779}\u{277A}\u{24FF} today.'],
    ['negative circled fifteen', 'Wait \u{24EF} minutes.'],
    ['double circled digits', 'Wait \u{24F8}\u{24F9} minutes.'],
    ['Roman numeral characters', 'Stage \u{2163}, wait \u{216B} hours.'],
    ['Roman numerals in letters after a stage', 'GRAP stage IV applies today.'],
    ['zero width joiner between digits', 'The AQI is 1\u{200D}1\u{200D}1 today.'],
    ['zero width non-joiner between allowed digits', 'Keep 2\u{200C}5 metres apart.'],
    ['combining grapheme joiner', 'The AQI is 2\u{034F}5\u{034F}2 today.'],
    ['variation selector', 'The AQI is 2\u{FE00}5\u{FE00}2 today.'],
    ['narrow no-break space', 'The AQI is 2\u{202F}5\u{202F}2 today.'],
    ['fraction slash', 'Use \u{00BD} of the time.'],
    ['Hindi sixteen', 'सोलह मिनट रुकें।'],
    ['Hindi thirty-five', 'पैंतीस मिनट रुकें।'],
    ['Hindi dozen', 'एक दर्जन लोग।'],
    ['Hindi quarter past', 'सवा दो घंटे रुकें।'],
    ['romanised ten', 'das minute baad niklo'],
    ['romanised four', 'chaar ghante ruko'],
    ['English score and fortnight', 'A score of people for a fortnight.'],
    ['English ordinal', 'The fifteenth floor is cleaner.'],
    ['one with a unit of measure', 'It adds 1 kg of CO2.'],
  ])('refuses %s', (_name, text) => {
    expect(accepted(text)).toBe(false);
  });

  it('reads joined digits as the number they look like', () => {
    expect(findNumerals('AQI 4\u{200D}5\u{200D}0').map((numeral) => numeral.raw)).toEqual(['450']);
    expect(findNumerals('2\u{202F}5\u{202F}2').map((numeral) => numeral.raw)).toEqual(['252']);
  });

  it('reads compound and fraction words as one value', () => {
    const value = (text: string): number[] =>
      findNumerals(text).map((numeral) => (numeral.kind === 'number' ? numeral.value : -1));
    expect(value('twenty-five minutes')).toEqual([25]);
    expect(value('साढ़े तीन घंटे')).toEqual([3.5]);
    expect(value('पौने दो बजे तक')).toEqual([1.75]);
    expect(value('\u{00BD} hour')).toEqual([0.5]);
    expect(value('Stage II and Stage IV')).toEqual([2, 4]);
  });

  it('still passes text that repeats allowed values, a count of one and pollutant names', () => {
    expect(accepted('The AQI is 287 today, 142.6 in the model, from 07:30.')).toBe(true);
    expect(accepted('Take 1 bus instead of 2 trips. PM2.5, N95 and CO₂ are names.')).toBe(true);
    expect(accepted('I think the 5 of you can go. MCD and IMD are offices.')).toBe(true);
    expect(accepted('दो लोग 07:30 बजे निकलें।')).toBe(true);
  });
});

describe('every common Hindi and romanised number word', () => {
  const devanagari =
    'दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस पैंतीस चालीस पैंतालीस अड़तालीस पचास साठ सत्तर पचहत्तर अस्सी नब्बे निन्यानवे सौ हज़ार दर्जन शून्य सवा पौने'.split(
      ' ',
    );
  const romanised =
    'das chaar chhe pandrah solah satrah atharah unnees ikkees pachees chaalees saath sattar assi nabbe hazaar sau'.split(
      ' ',
    );

  it.each([...devanagari, ...romanised])('reads %s as a number', (word) => {
    expect(findNumerals(`${word} मिनट`)).toHaveLength(1);
  });
});

describe('links and contact details in model text', () => {
  it.each([
    'Visit http://free-purifier.example to claim one.',
    'See www.cleanair.in for more.',
    'Read more at cleanair.org today.',
    'Write to help@cleanair.in.',
    'Call 98765 43210 for a free check.',
    'Call +91 98765 43210.',
    'Toll free 1800 123 4567.',
  ])('refuses %s', (text) => {
    expect(proseProblem([text])).toBe('link');
  });

  it('passes ordinary plan text with figures, times and names', () => {
    expect(proseProblem(['PM2.5 fell 3.2 kg, at 07:45, N95 and CaN99, CO₂. Call 112.'])).toBeNull();
    expect(proseProblem(['14 km.In the morning, e.g. at 7 a.m.'])).toBeNull();
  });
});

describe('invisible characters in prose', () => {
  it('refuses joiners outside Devanagari and marks that follow no letter', () => {
    expect(proseProblem(['4\u{200D}five'])).toBe('hidden');
    expect(proseProblem(['2\u{FE00}5'])).toBe('hidden');
    expect(proseProblem(['\u{0301}start'])).toBe('hidden');
    expect(proseProblem(['क्\u{200D}ष क्\u{200C}ष'])).toBeNull();
  });
});

describe('medical questions the gate once missed', () => {
  it.each([
    'My dad finds it hard to breathe on the stairs today, is that normal?',
    'My daughter has trouble breathing after play, what helps?',
    'Breathing difficulty since morning, what to do?',
    'cant breath properly, what should i do',
    'His chest feels tight after the walk.',
    'मेरे बच्चे को सांस लेने में तकलीफ हो रही है, क्या करें?',
    'मेरे बच्चे को साँस लेने में तकलीफ़ हो रही है',
    'bachche ko saans lene mein dikkat hai kya karein',
  ])('sends "%s" to the emergency reply', (question) => {
    expect(medicalGate(question)).toBe('emergency');
  });

  it.each([
    'My son keeps hacking all night. What should I give him?',
    'Is her asthma pump enough for the morning walk?',
    'Should I give Montair or Allegra before he goes out?',
    'Can he use Seroflo or Foracort today?',
    'Is Benadryl or Vicks ok for my kid tonight?',
    'Is nebulization needed before school?',
    'Can he take Levolin, Otrivin or Combiflam?',
    'My throat hurts and my eyes sting, is it the smog?',
    'Is it safe to give honey and tulsi for his throat?',
    'Her nose is bleeding since the morning, is it the air?',
    'My mother is allergic to dust, what should she take?',
    'पापा की तबीयत खराब है, क्या बाहर जाएं?',
    'बच्चा बीमार है, स्कूल भेजें?',
    'गले में दर्द है, क्या करें?',
    'आंखों से पानी आ रहा है',
    'papa ki tabiyat kharab hai',
    'gale mein dard hai kya lena chahiye',
    'naak beh rahi hai',
    'my son is c-o-u-g-h-i-n-g a lot',
    'my son is coughhing a lot',
    'My son is c\u{043E}ughing a lot',
    'My son is cou\u{200B}ghing a lot',
    'Should he take para cetamol?',
  ])('sends "%s" to the fixed reply', (question) => {
    expect(medicalGate(question)).not.toBeNull();
  });

  it('still lets a planning question about a child with asthma reach the planner', () => {
    expect(
      medicalGate('Our son has asthma and football at 18:00. Can he still play today, or should we move it?'),
    ).toBeNull();
    expect(medicalGate('दादी सुबह 7 बजे पार्क में टहलती हैं। क्या आज उन्हें जाना चाहिए?')).toBeNull();
  });
});

describe('treatment advice in a reply', () => {
  it.each([
    'Give him warm water with honey and keep him indoors; if his lips turn blue go to hospital.',
    'Use the blue reliever two puffs before leaving.',
    'Take the Montair at night as usual and Allegra in the morning.',
    'A spoon of kadha and steam twice a day will clear his chest.',
    'उसे शहद के साथ गुनगुना पानी दें।',
  ])('is refused: %s', (reply) => {
    expect(mentionsTreatment(reply)).toBe(true);
  });

  it('is not found in a planning answer that sends the person to a doctor', () => {
    expect(
      mentionsTreatment(
        'Move football to 15:00, when the forecast is cleaner. For anything about his asthma, please ask a doctor.',
      ),
    ).toBe(false);
  });
});
