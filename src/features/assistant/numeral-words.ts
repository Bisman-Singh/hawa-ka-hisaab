// Number words and month names in English, Hindi in Devanagari and romanised Hindi, as data for the numeral finder.
// One and its Hindi forms are left out on purpose: the number guard lets the count one through as a plain word.

const table = (pairs: string): ReadonlyMap<string, number> =>
  new Map(
    pairs
      .trim()
      .split(/\s+/u)
      .map((pair): [string, number] => {
        const [word = '', value = ''] = pair.split('=');
        return [word.normalize('NFKC'), Number(value)];
      }),
  );

/** Words that state a quantity, with their values. Compound phrases are read word by word. */
export const NUMBER_WORDS = table(`
zero=0 two=2 three=3 four=4 five=5 six=6 seven=7 eight=8 nine=9 ten=10 eleven=11 twelve=12 thirteen=13
fourteen=14 fifteen=15 sixteen=16 seventeen=17 eighteen=18 nineteen=19 twenty=20 thirty=30 forty=40 fifty=50
sixty=60 seventy=70 eighty=80 ninety=90 hundred=100 hundreds=100 thousand=1000 thousands=1000 lakh=1e5 lakhs=1e5
crore=1e7 crores=1e7 million=1e6 millions=1e6 billion=1e9 dozen=12 dozens=12 half=0.5 quarter=0.25 twice=2
double=2 triple=3 thrice=3 threefold=3 tenfold=10
दो=2 तीन=3 चार=4 पांच=5 पाँच=5 छह=6 छः=6 सात=7 आठ=8 नौ=9 दस=10 ग्यारह=11 बारह=12 पंद्रह=15 बीस=20 पच्चीस=25
तीस=30 चालीस=40 पचास=50 साठ=60 सत्तर=70 अस्सी=80 नब्बे=90 सौ=100 हज़ार=1000 हजार=1000 लाख=1e5 करोड़=1e7
आधा=0.5 आधी=0.5 आधे=0.5 डेढ़=1.5 ढाई=2.5 दोगुना=2 दुगना=2 तिगुना=3 चौथाई=0.25
paanch=5 panch=5 chhah=6 saat=7 aath=8 nau=9 gyarah=11 barah=12 bees=20 pachchis=25 tees=30 chalis=40 pachas=50
pachaas=50 sau=100 hazaar=1000 hazar=1000 karod=1e7 aadha=0.5 adha=0.5 dedh=1.5 dhai=2.5 dugna=2 doguna=2
`);

/** Month names and short forms with their month numbers, 1 for January. */
export const MONTH_NAMES = table(`
january=1 jan=1 जनवरी=1 february=2 feb=2 फ़रवरी=2 फरवरी=2 march=3 mar=3 मार्च=3 april=4 apr=4 अप्रैल=4 may=5 मई=5
june=6 jun=6 जून=6 july=7 jul=7 जुलाई=7 august=8 aug=8 अगस्त=8 september=9 sept=9 sep=9 सितंबर=9 सितम्बर=9
october=10 oct=10 अक्टूबर=10 अक्तूबर=10 november=11 nov=11 नवंबर=11 नवम्बर=11 december=12 dec=12 दिसंबर=12 दिसम्बर=12
`);
