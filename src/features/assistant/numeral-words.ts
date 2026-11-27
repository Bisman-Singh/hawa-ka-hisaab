// Number words and month names in English, Hindi in Devanagari and romanised Hindi, as data for the numeral finder.
// One and its Hindi forms are left out on purpose: the guard lets a count of one through as a plain word.

const NUKTA = /\u093C/gu;
const CHANDRABINDU = /\u0901/gu;

/** A word as the finder compares it: NFKC, lower case, with nukta dots dropped and chandrabindu read as anusvara. */
export function wordKey(word: string): string {
  return word.normalize('NFKC').toLowerCase().replace(NUKTA, '').replace(CHANDRABINDU, '\u0902');
}

const table = (pairs: string): ReadonlyMap<string, number> =>
  new Map(
    pairs
      .trim()
      .split(/\s+/u)
      .map((pair): [string, number] => {
        const [word = '', value = ''] = pair.split('=');
        return [wordKey(word), Number(value)];
      }),
  );

/** English number words, ordinals and counting nouns. Second and first are left out: they mean time and one. */
const ENGLISH = `
zero=0 two=2 three=3 four=4 five=5 six=6 seven=7 eight=8 nine=9 ten=10 eleven=11 twelve=12 thirteen=13
fourteen=14 fifteen=15 sixteen=16 seventeen=17 eighteen=18 nineteen=19 twenty=20 thirty=30 forty=40 fifty=50
sixty=60 seventy=70 eighty=80 ninety=90 hundred=100 hundreds=100 thousand=1000 thousands=1000 lakh=1e5 lakhs=1e5
crore=1e7 crores=1e7 million=1e6 millions=1e6 billion=1e9 dozen=12 dozens=12 half=0.5 quarter=0.25 twice=2
double=2 triple=3 thrice=3 threefold=3 tenfold=10 couple=2 pair=2 score=20 fortnight=14 century=100
third=3 fourth=4 fifth=5 sixth=6 seventh=7 eighth=8 ninth=9 tenth=10 eleventh=11 twelfth=12 thirteenth=13
fourteenth=14 fifteenth=15 sixteenth=16 seventeenth=17 eighteenth=18 nineteenth=19 twentieth=20 thirtieth=30
fortieth=40 fiftieth=50 sixtieth=60 seventieth=70 eightieth=80 ninetieth=90 hundredth=100 thousandth=1000
`;

/** Hindi number words from zero to a hundred, with the common spellings of each, and larger units. */
const HINDI = `
शून्य=0 दो=2 तीन=3 चार=4 पांच=5 छह=6 छः=6 छे=6 सात=7 आठ=8 नौ=9 दस=10 ग्यारह=11 बारह=12 तेरह=13 चौदह=14 पंद्रह=15
पन्द्रह=15 सोलह=16 सत्रह=17 सत्तरह=17 अठारह=18 उन्नीस=19 बीस=20 इक्कीस=21 बाईस=22 तेईस=23 चौबीस=24 पच्चीस=25
छब्बीस=26 सत्ताईस=27 अट्ठाईस=28 अठ्ठाईस=28 अठाईस=28 उनतीस=29 उन्तीस=29 तीस=30 इकतीस=31 इकत्तीस=31 बत्तीस=32
तैंतीस=33 तेंतीस=33 चौंतीस=34 पैंतीस=35 छत्तीस=36 सैंतीस=37 अड़तीस=38 उनतालीस=39 उनचालीस=39 चालीस=40
इकतालीस=41 बयालीस=42 तैंतालीस=43 चवालीस=44 चौवालीस=44 पैंतालीस=45 छियालीस=46 सैंतालीस=47 अड़तालीस=48 उनचास=49
पचास=50 इक्यावन=51 बावन=52 तिरपन=53 तिरेपन=53 चौवन=54 चव्वन=54 पचपन=55 छप्पन=56 सत्तावन=57 अट्ठावन=58
अठावन=58 उनसठ=59 साठ=60 इकसठ=61 बासठ=62 तिरसठ=63 चौंसठ=64 पैंसठ=65 छियासठ=66 सड़सठ=67 अड़सठ=68 उनहत्तर=69
सत्तर=70 इकहत्तर=71 बहत्तर=72 तिहत्तर=73 चौहत्तर=74 पचहत्तर=75 छिहत्तर=76 सतहत्तर=77 अठहत्तर=78 उन्यासी=79
उनासी=79 अस्सी=80 इक्यासी=81 बयासी=82 तिरासी=83 चौरासी=84 पचासी=85 छियासी=86 सत्तासी=87 अट्ठासी=88 अठासी=88
नवासी=89 नब्बे=90 इक्यानवे=91 बानवे=92 तिरानवे=93 चौरानवे=94 पचानवे=95 छियानवे=96 सत्तानवे=97 अट्ठानवे=98
अठानवे=98 निन्यानवे=99 निन्यानबे=99 सौ=100 हज़ार=1000 लाख=1e5 करोड़=1e7 दर्जन=12
आधा=0.5 आधी=0.5 आधे=0.5 चौथाई=0.25 पौना=0.75 सवा=1.25 डेढ़=1.5 ढाई=2.5 साढ़े=0.5 पौने=0.75
दोगुना=2 दुगना=2 दुगुना=2 तिगुना=3
`;

/**
 * Romanised Hindi number words. Teen is left out: in English text it means a teenager, and the model writes
 * Hindi in Devanagari, so it is almost always the English word.
 */
const ROMANISED = `
chaar=4 char=4 paanch=5 panch=5 chhah=6 chhe=6 cheh=6 saat=7 aath=8 nau=9 das=10 gyarah=11 gyaarah=11
barah=12 baarah=12 terah=13 chaudah=14 pandrah=15 solah=16 satrah=17 atharah=18 athaarah=18 unnees=19 unnis=19
bees=20 ikkees=21 bais=22 baais=22 teis=23 chaubees=24 pachees=25 pachchis=25 pachis=25 chhabbees=26
sattais=27 atthais=28 untees=29 tees=30 battis=32 paintis=35 chalis=40 chalees=40 chaalees=40 paintalis=45
pachas=50 pachaas=50 saath=60 sattar=70 assi=80 nabbe=90 sau=100 hazaar=1000 hazar=1000 lakh=1e5 karod=1e7
aadha=0.5 adha=0.5 sawa=1.25 dedh=1.5 dhai=2.5 dhaai=2.5 saadhe=0.5 sadhe=0.5 paune=0.75 dugna=2 doguna=2
darjan=12 shunya=0
`;

/** Words that state a quantity, with their values. Compound phrases are read by the finder's compound patterns. */
export const NUMBER_WORDS = table(`${ENGLISH} ${HINDI} ${ROMANISED}`);

/** English tens that take a unit after a hyphen or space, such as twenty-five. */
export const ENGLISH_TENS = table(
  'twenty=20 thirty=30 forty=40 fifty=50 sixty=60 seventy=70 eighty=80 ninety=90',
);

/** English units one to nine for compounds such as twenty-one. */
export const ENGLISH_UNITS = table('one=1 two=2 three=3 four=4 five=5 six=6 seven=7 eight=8 nine=9');

/** Fraction words that change the number after them: a quarter more, a half more, a quarter less. */
export const FRACTION_PREFIXES = table(
  'सवा=0.25 साढ़े=0.5 पौने=-0.25 sawa=0.25 saadhe=0.5 sadhe=0.5 paune=-0.25',
);

/** Month names and short forms with their month numbers, 1 for January. */
export const MONTH_NAMES = table(`
january=1 jan=1 जनवरी=1 february=2 feb=2 फ़रवरी=2 फरवरी=2 march=3 mar=3 मार्च=3 april=4 apr=4 अप्रैल=4 may=5 मई=5
june=6 jun=6 जून=6 july=7 jul=7 जुलाई=7 august=8 aug=8 अगस्त=8 september=9 sept=9 sep=9 सितंबर=9 सितम्बर=9
october=10 oct=10 अक्टूबर=10 अक्तूबर=10 november=11 nov=11 नवंबर=11 नवम्बर=11 december=12 dec=12 दिसंबर=12 दिसम्बर=12
`);
