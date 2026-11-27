// Labels a plan's entries and reckoning carry in the plan's own language, English or Hindi, so a Hindi plan reads
// as Hindi around its text. Hindi spelling follows the plan text tables.
import type { Slot } from '../../features/planner/types.js';
import type { Language } from '../../lib/types.js';

/** The labels a plan's entries and reckoning carry, in the plan's own language. {time} and {count} are filled in. */
export interface PlanLabels {
  readonly fixed: string;
  readonly canMove: string;
  readonly from: string;
  readonly movedTo: string;
  readonly minutes: string;
  readonly why: string;
  readonly tradeOff: string;
  readonly effect: string;
  readonly breathedIn: string;
  readonly co2: string;
  readonly noFigure: string;
  readonly noneNeeded: string;
  readonly whatIf: string;
  readonly asPlanned: string;
  readonly whatIfNeedsForecast: string;
  readonly working: string;
  readonly slots: Readonly<Record<Slot, string>>;
  readonly hoursTo: string;
  readonly empty: string;
  readonly reckoning: string;
  readonly reckoningNote: string;
  readonly reckoningNone: string;
  readonly reckoningEmpty: string;
  readonly reckoningNo: string;
}

const LABELS_EN: PlanLabels = {
  fixed: 'fixed',
  canMove: 'can move',
  from: 'from {time}',
  movedTo: 'Moved to {time}',
  minutes: '{count} minutes',
  why: 'Why.',
  tradeOff: 'Trade-off.',
  effect: 'Effect',
  breathedIn: 'Breathed in',
  co2: 'Travel CO₂',
  noFigure: 'No figure. No measured factor for this step.',
  noneNeeded: 'None needed.',
  whatIf: 'What if',
  asPlanned: 'As planned',
  whatIfNeedsForecast:
    'Other start times need the forecast this plan was made with, which did not come with it.',
  working: 'Show the working',
  slots: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' },
  hoursTo: 'to',
  empty: 'Nothing planned in this part of the day.',
  reckoning: "The day's reckoning",
  reckoningNote:
    'Each line is the change for one person against their usual day. Lines are not added across people or trips. Where no measured factor exists, no figure is shown.',
  reckoningNone: 'Nothing to change today, so nothing to add up.',
  reckoningEmpty: 'Changes with a measured figure',
  reckoningNo: 'None',
};

/** The plan's labels in English and in Hindi. Hindi spelling follows the plan text tables. */
export const PLAN_LABELS: Readonly<Record<Language, PlanLabels>> = {
  en: LABELS_EN,
  hi: {
    fixed: 'तय',
    canMove: 'बदल सकता है',
    from: '{time} से',
    movedTo: 'समय बदला, अब {time} बजे',
    minutes: '{count} मिनट',
    why: 'क्यों।',
    tradeOff: 'समझौता।',
    effect: 'असर',
    breathedIn: 'साँस में प्रदूषण',
    co2: 'सफर का CO₂',
    noFigure: 'कोई आँकड़ा नहीं। इस कदम के लिए कोई मापा हुआ कारक नहीं है।',
    noneNeeded: 'जरूरत नहीं।',
    whatIf: 'अगर ऐसा हो तो',
    asPlanned: 'जैसा तय है',
    whatIfNeedsForecast: 'दूसरे समय का असर उस पूर्वानुमान से निकलता है जिससे यह योजना बनी, और वह इसके साथ नहीं आया।',
    working: 'पूरा हिसाब देखें, यह अंग्रेजी में है',
    slots: { morning: 'सुबह', afternoon: 'दोपहर', evening: 'शाम' },
    hoursTo: 'से',
    empty: 'दिन के इस हिस्से में कुछ तय नहीं है।',
    reckoning: 'दिन का हिसाब',
    reckoningNote:
      'हर पंक्ति एक व्यक्ति के आम दिन के मुकाबले बदलाव है। अलग लोगों या सफर की पंक्तियाँ जोड़ी नहीं जातीं। जहाँ कोई मापा हुआ कारक नहीं है, वहाँ आँकड़ा नहीं दिखाया जाता।',
    reckoningNone: 'आज कुछ बदलना नहीं है, इसलिए जोड़ने को कुछ नहीं।',
    reckoningEmpty: 'मापे हुए आँकड़े वाले बदलाव',
    reckoningNo: 'कोई नहीं',
  },
};
