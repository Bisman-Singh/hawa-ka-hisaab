// Hindi text for the notice frame, band names, health advice and the day's actions, as data. Written as a
// society or school office would write it; numbers enter only through {placeholders}, in international digits.
import type { AqiBand } from '../naqi/types.js';
import type { ActionId } from './rules.js';
import { same, type FrameText, type PerKind } from './text-en.js';

/** CPCB band names in Hindi. */
export const BAND_HI: Readonly<Record<AqiBand, string>> = {
  good: 'अच्छा',
  satisfactory: 'संतोषजनक',
  moderate: 'मध्यम',
  poor: 'खराब',
  very_poor: 'बहुत खराब',
  severe: 'गंभीर',
};

const LESS = 'बाहर देर तक या ज्यादा मेहनत वाली शारीरिक गतिविधि कम करें';
const NO_SPECIAL = 'कोई खास सावधानी जरूरी नहीं';
const AVOID_ACTIVITIES = 'बाहर की शारीरिक गतिविधियों से बचें';
const INDOORS = 'अंदर रहें और गतिविधि कम रखें';

/** The health ministry advice by band, in our Hindi rendering of the English text. */
export const ADVICE_HI: Readonly<Record<AqiBand, { readonly general: string; readonly vulnerable: string }>> =
  {
    good: { general: NO_SPECIAL, vulnerable: NO_SPECIAL },
    satisfactory: { general: NO_SPECIAL, vulnerable: LESS },
    moderate: { general: LESS, vulnerable: 'बाहर देर तक या ज्यादा मेहनत वाली शारीरिक गतिविधि से बचें' },
    poor: { general: 'बाहर शारीरिक मेहनत से बचें', vulnerable: AVOID_ACTIVITIES },
    very_poor: { general: `${AVOID_ACTIVITIES}, खासकर सुबह और देर शाम के समय`, vulnerable: INDOORS },
    severe: { general: AVOID_ACTIVITIES, vulnerable: INDOORS },
  };

/** The Hindi notice frame. */
export const FRAME_HI: FrameText = {
  title: {
    school: 'अभिभावकों और स्टाफ के लिए वायु गुणवत्ता सूचना, {date}',
    housing_society: 'निवासियों के लिए वायु गुणवत्ता सूचना, {date}',
  },
  greeting: { school: 'आदरणीय अभिभावकगण एवं स्टाफ,', housing_society: 'आदरणीय निवासीगण,' },
  reading: {
    station: 'आज हवा "{band}" श्रेणी में है। CPCB के {station} स्टेशन पर {time} बजे AQI {aqi} था।',
    station_no_aqi: 'CPCB ने नजदीकी स्टेशन {station} के लिए {time} बजे का AQI जारी नहीं किया है।',
    modelled:
      'मॉडल के अनुमान से आज हवा "{band}" श्रेणी में है, अनुमानित AQI {aqi}। यह Open-Meteo के जरिए CAMS मॉडल का {time} बजे का अनुमान है, असली माप नहीं, और शहरों में अक्सर कम आंकता है।',
    none: 'अभी हवा की कोई रीडिंग उपलब्ध नहीं है।',
  },
  stale: ' यह रीडिंग तीन घंटे से ज्यादा पुरानी है।',
  closing: {
    school:
      'यह सूचना विद्यालय कार्यालय की ओर से है और स्वास्थ्य मंत्रालय की वायु प्रदूषण संबंधी सलाह पर आधारित है। यह सामान्य जानकारी है, चिकित्सा सलाह नहीं। साँस फूलने, खाँसी या सीने में दर्द होने पर डॉक्टर को दिखाएँ।',
    housing_society:
      'यह सूचना प्रबंध समिति की ओर से है और स्वास्थ्य मंत्रालय की वायु प्रदूषण संबंधी सलाह पर आधारित है। यह सामान्य जानकारी है, चिकित्सा सलाह नहीं। साँस फूलने, खाँसी या सीने में दर्द होने पर डॉक्टर को दिखाएँ।',
  },
};

/** Hindi notice lines for the day's actions: advice, assembly and outdoor activity. */
export const ACTIONS_HI_DAY = {
  'health-advice': {
    school:
      '"{band}" हवा के लिए स्वास्थ्य सलाह। सभी विद्यार्थियों के लिए, और उन स्टाफ सदस्यों के लिए जो गर्भवती हैं, बुजुर्ग हैं या जिन्हें दिल या फेफड़ों की बीमारी है: {vuln}। बाकी स्टाफ के लिए: {gen}।',
    housing_society:
      '"{band}" हवा के लिए स्वास्थ्य सलाह। बच्चों, बुजुर्गों, गर्भवती महिलाओं और दिल या फेफड़ों की बीमारी वाले लोगों के लिए: {vuln}। बाकी सभी के लिए: {gen}।',
  },
  'normal-day': {
    school: 'आज प्रार्थना सभा, बाहर के पीरियड और खेल सामान्य रूप से हो सकते हैं।',
    housing_society: 'आज बाहर की गतिविधियाँ सामान्य रूप से हो सकती हैं।',
  },
  'check-reading': same('बाहर की गतिविधियों से पहले AQI दोबारा देखें और उस श्रेणी की स्वास्थ्य सलाह मानें।'),
  'assembly-indoors': {
    school: 'आज {assembly} बजे की प्रार्थना सभा बाहर नहीं, कक्षाओं या हॉल में करें।',
    housing_society: 'आज {assembly} बजे की सभा अंदर करें या टाल दें।',
  },
  'outdoor-indoors': {
    school: 'आज {periodTimes} बजे की बाहर की गतिविधियाँ अंदर कराएँ, और ब्रेक में भी बच्चे अंदर ही रहें।',
    housing_society: 'आज {periodTimes} बजे की बाहर की गतिविधियाँ अंदर करें या टाल दें।',
  },
  'outdoor-move': {
    school:
      'टाइमटेबल में गुंजाइश हो तो {worseTimes} बजे की बाहर की गतिविधियाँ {winStart} से {winEnd} बजे के बीच कराएँ। आज के पूर्वानुमान में ये सबसे साफ घंटे हैं।',
    housing_society:
      'हो सके तो {worseTimes} बजे की बाहर की गतिविधियाँ {winStart} से {winEnd} बजे के बीच करें। आज के पूर्वानुमान में ये सबसे साफ घंटे हैं।',
  },
  'outdoor-light': same('आज बाहर की गतिविधियाँ हल्की रखें, देर तक दौड़-भाग या भारी कसरत न हो।'),
} satisfies Partial<Record<ActionId, PerKind>>;
