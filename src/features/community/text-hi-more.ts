// Hindi notice lines for the indoor, staff, source and GRAP actions, as data. Numbers enter only through
// {placeholders}, in international digits, as in the English text.
import type { ActionId } from './rules.js';
import { same, type PerKind } from './text-en.js';

const NO_MASK = 'कपड़े या कागज के मास्क, रूमाल और दुपट्टे से बचाव नहीं होता।';
const PROTECT_STAFF = 'N{n95} मास्क दें, बाहर की ड्यूटी बारी-बारी से लगाएँ और अंदर आराम का समय दें।';
const NO_BURNING = 'पत्ते, कूड़ा या कोई भी कचरा न जलाएँ। कचरा कूड़ा-गाड़ी में ही दें।';

/** Hindi notice lines for windows, mopping, masks, staff, sources and GRAP. */
export const ACTIONS_HI_MORE = {
  windows: same(
    'सुबह और देर शाम दरवाजे-खिड़कियाँ बंद रखें। कमरों में हवा आने देनी हो तो दोपहर {ventFrom} से शाम {ventTo} बजे के बीच खिड़कियाँ खोलें।',
  ),
  'wet-mopping': {
    school: 'बच्चों के आने से पहले फर्श झाड़ू से नहीं, गीले पोंछे से साफ करें।',
    housing_society: 'लॉबी, सीढ़ियाँ और गलियारे झाड़ू से नहीं, गीले पोंछे से साफ करें।',
  },
  masks: {
    school: `जिन बड़ों को बाहर रहना जरूरी है, जैसे गेट स्टाफ, वे कम समय के लिए ठीक से फिट N{n95} या N{n99} मास्क पहनें। ${NO_MASK} बच्चों के लिए मास्क कितने कारगर हैं, इसका परखा हुआ प्रमाण नहीं है।`,
    housing_society: `बाहर जाना जरूरी हो तो कम समय के लिए ठीक से फिट N{n95} या N{n99} मास्क पहनें। ${NO_MASK}`,
  },
  'outdoor-staff': {
    school: `गेट स्टाफ और बाहर काम करने वाले कर्मचारियों को ${PROTECT_STAFF}`,
    housing_society: `गार्ड, सफाईकर्मी और माली दिन भर बाहर काम करते हैं। उन्हें ${PROTECT_STAFF}`,
  },
  'no-idling': {
    school: 'ड्राइवर और अभिभावक गेट पर इंतजार करते समय गाड़ी का इंजन बंद रखें। बच्चे चालू गाड़ियों से दूर खड़े हों।',
    housing_society: 'ड्राइवर, कैब और डिलीवरी वाले गेट पर इंतजार करते समय इंजन बंद रखें।',
  },
  'stop-waste-burning': {
    school: `स्कूल परिसर में या उसके आसपास ${NO_BURNING}`,
    housing_society: `सोसाइटी में या उसके आसपास ${NO_BURNING}`,
  },
  'generator-essential': same('जनरेटर सिर्फ बिजली जाने पर और जरूरी कामों के लिए ही चलाएँ।'),
  'grap-stage': same(
    'दिल्ली NCR में CAQM के {orderDate} के आदेश के तहत GRAP का स्टेज {stage} लागू है। इसका नागरिक चार्टर सभी से कहता है कि गाड़ी खड़ी करके इंजन चालू न रखें, DG सेट सिर्फ जरूरी कामों के लिए चलाएँ और खुले में कचरा न जलाएँ।',
  ),
  'grap-sports': same(
    'CAQM की सलाह है कि NCR में नवंबर और दिसंबर में होने वाली खेल प्रतियोगिताओं की तारीखें विद्यार्थियों की सेहत को देखते हुए बदली जाएँ।',
  ),
} satisfies Partial<Record<ActionId, PerKind>>;
