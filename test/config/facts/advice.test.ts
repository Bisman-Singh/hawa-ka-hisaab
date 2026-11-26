// Tests for the band advice: the advisory table word for word, for each band and group.
import { describe, expect, it } from 'vitest';
import { ADVICE_FACTS, adviceFactId, adviceText } from '../../../src/config/facts/advice.js';

describe('band advice', () => {
  it('quotes the advisory table for the general and the vulnerable population', () => {
    expect(adviceText('good', 'vulnerable')).toBe('No special precautions');
    expect(adviceText('satisfactory', 'general')).toBe('No special precautions');
    expect(adviceText('satisfactory', 'vulnerable')).toBe(
      'Do less prolonged or strenuous outdoor physical exertion',
    );
    expect(adviceText('moderate', 'vulnerable')).toBe(
      'Avoid prolonged or strenuous outdoor physical exertion',
    );
    expect(adviceText('poor', 'general')).toBe('Avoid outdoor physical exertion');
    expect(adviceText('poor', 'vulnerable')).toBe('Avoid outdoor physical activities');
    expect(adviceText('very_poor', 'general')).toBe(
      'Avoid outdoor physical activities, especially during morning and late evening hours',
    );
    expect(adviceText('severe', 'vulnerable')).toBe('Remain indoors and keep activity levels low');
  });

  it('has one fact per band and group, plus who counts as vulnerable', () => {
    expect(adviceFactId('very_poor', 'vulnerable')).toBe('advice-very-poor-vulnerable');
    expect(ADVICE_FACTS).toHaveLength(13);
    const ids = ADVICE_FACTS.map((fact) => fact.id);
    expect(ids).toContain('advice-severe-general');
    expect(ids).toContain('advice-vulnerable-groups');
    const letter = ADVICE_FACTS.find((fact) => fact.id === 'advice-vulnerable-groups');
    expect(letter?.kind === 'text' && letter.text).toMatch(/^Vulnerable populations including /);
    for (const fact of ADVICE_FACTS) {
      expect(fact.source.url).toBe('https://ncdc.mohfw.gov.in/uploads/pdf/air2.pdf');
    }
  });
});
