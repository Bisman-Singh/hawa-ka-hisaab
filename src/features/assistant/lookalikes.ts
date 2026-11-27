// Text as the medical gate reads it: one form for Hindi spellings, no invisible characters, Latin letters in place
// of Cyrillic and Greek lookalikes, and single letters spelled out with hyphens or dots joined back into words.

const LOOKALIKES: ReadonlyMap<string, string> = new Map(
  [
    'аa еe оo рp сc уy хx кk мm тt вb нh іi јj ѕs ԁd ӏl ԛq ԝw',
    'АA ВB ЕE КK МM НH ОO РP СC ТT ХX УY ІI ЈJ ЅS',
    'αa οo ρp εe ιi κk νv τt υu χx ΑA ΒB ΕE ΖZ ΗH ΙI ΚK ΜM ΝN ΟO ΡP ΤT ΥY ΧX',
  ]
    .join(' ')
    .split(' ')
    .map((pair): [string, string] => [pair.charAt(0), pair.charAt(1)]),
);

const INVISIBLE = /\p{Cf}|\p{Variation_Selector}|\u{034F}|\u{180E}/gu;
const GREEK_OR_CYRILLIC = /[\p{Script=Cyrillic}\p{Script=Greek}]/gu;
const SPELLED_OUT = /(?<![\p{L}\p{N}])(?:\p{L}[-._·*]){2,}\p{L}(?![\p{L}\p{N}])/gu;

/** NFKC with nukta dots dropped and chandrabindu read as anusvara, so Hindi spelling variants compare equal. */
export function foldDevanagari(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/\u093C/gu, '')
    .replace(/\u0901/gu, '\u0902');
}

/**
 * The text as the gate matches it: Hindi folded, invisible characters removed, lookalike letters replaced, curly
 * apostrophes made straight and letters spelled out one by one, such as c-o-u-g-h, joined into a word.
 */
export function readForMatching(text: string): string {
  return foldDevanagari(text)
    .replace(INVISIBLE, '')
    .replace(GREEK_OR_CYRILLIC, (char) => LOOKALIKES.get(char) ?? char)
    .replace(/[‘’ʼ]/gu, "'")
    .replace(SPELLED_OUT, (word) => word.replace(/[-._·*]/gu, ''));
}
