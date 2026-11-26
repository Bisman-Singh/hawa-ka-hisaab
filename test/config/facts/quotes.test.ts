// Tests for the rules every quoted fact follows: cuts are marked with [...] and OCR slips do not come back.
import { describe, expect, it } from 'vitest';
import { FACT_LIST, findFact } from '../../../src/config/facts/index.js';

const quotes = FACT_LIST.flatMap((fact) => (fact.kind === 'text' ? [fact] : []));
const MARKER = '[...]';

describe('quoted facts', () => {
  it('mark a cut only with [...], never with a bare ellipsis', () => {
    const bare = quotes.filter((fact) => fact.text.replaceAll(MARKER, '').includes('...'));
    expect(bare.map((fact) => fact.id)).toEqual([]);
  });

  it('carry the marker in every quote known to leave words out', () => {
    const cut = [
      'community-advice-vulnerable-groups',
      'community-advice-school-outdoor',
      'community-advice-school-gates',
      'community-advice-workers',
      'community-grap-charter',
      'mask-leakage-quote',
      'solid-fuel-quote',
      'ncr-districts',
    ];
    for (const id of cut) {
      const fact = findFact(id);
      expect(fact?.kind === 'text' && fact.text.includes(MARKER), id).toBe(true);
    }
  });

  it('never join two sentences with a comma and a capital letter, the slip OCR made in the advisory', () => {
    const slips = quotes.filter((fact) => /[a-z], (Do|Avoid|Use|Ensure) /.test(fact.text));
    expect(slips.map((fact) => fact.id)).toEqual([]);
  });

  it('keep the marker spaced as a word, so no cut is glued to a neighbouring word', () => {
    const glued = quotes.filter((fact) => /\S\[\.\.\.\]|\[\.\.\.\]\S/.test(fact.text));
    expect(glued.map((fact) => fact.id)).toEqual([]);
  });
});
