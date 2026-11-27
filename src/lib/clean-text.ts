// Cleans short text that comes from upstream data, such as station names, before anything shows it or sends it
// to a model: no control, format or bidi characters and no runs of space. Length is left to the schema.

const INVISIBLE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
const SPACES = /\s+/gu;

/**
 * A name as it may be shown: NFKC normalised, control, format and bidi characters made spaces, every run of space
 * made one space and trimmed. Upstream text is data, so nothing else is changed; an overlong name still fails
 * the schema that checks it.
 */
export function cleanName(raw: string): string {
  return raw.normalize('NFKC').replace(INVISIBLE, ' ').replace(SPACES, ' ').trim();
}
