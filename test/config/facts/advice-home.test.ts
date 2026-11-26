// Tests for the home advice quotes.
import { describe, expect, it } from 'vitest';
import { HOME_ADVICE_FACTS } from '../../../src/config/facts/advice-home.js';

describe('home advice', () => {
  it('quotes the airing window, mopping, masks, purifiers and smoke sources from the advisory', () => {
    const text = Object.fromEntries(
      HOME_ADVICE_FACTS.map((fact) => [fact.id, fact.kind === 'text' ? fact.text : '']),
    );
    expect(text['advice-ventilate']).toContain('between 12 p.m. to 4 p.m.');
    expect(text['advice-wet-mopping']).toContain('wet mopping instead of sweeping');
    expect(text['advice-masks']).toContain(
      'Paper masks, handkerchiefs, scarves and cloth are not effective.',
    );
    expect(text['advice-purifier-ozone']).toContain('generating ozone');
    expect(text['advice-coils-incense']).toBe(
      'Avoid burning mosquito coils and incense sticks in closed premises.',
    );
    expect(HOME_ADVICE_FACTS.every((fact) => fact.kind === 'text' && fact.lang === 'en')).toBe(true);
  });
});
