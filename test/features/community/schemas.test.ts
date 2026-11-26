// Tests for the community inputs, actions and notice.
import { describe, expect, it } from 'vitest';
import { communityActionSchema, communityInputSchema } from '../../../src/features/community/schemas.js';
import { noticeReplySchema, noticeSchema } from '../../../src/features/community/schemas.js';
import { sampleCommunity } from '../../support/samples.js';

describe('communityInputSchema', () => {
  it('accepts a housing society with a home count', () => {
    expect(communityInputSchema.safeParse(sampleCommunity()).success).toBe(true);
  });

  it('needs a home count for a society and a pupil count for a school', () => {
    const society = communityInputSchema.safeParse({ ...sampleCommunity(), homes: null });
    expect(society.error?.issues[0]?.message).toBe(
      'a school needs a pupil count and a housing society needs a home count',
    );
    const school = { ...sampleCommunity(), kind: 'school', homes: null };
    expect(communityInputSchema.safeParse(school).success).toBe(false);
    expect(communityInputSchema.safeParse({ ...school, pupils: 600, assembly: '08:00' }).success).toBe(true);
  });
});

describe('communityActionSchema', () => {
  it('needs a cited fact on every action', () => {
    const action = {
      id: 'gate-idling',
      title: 'Stop idling at the gate',
      detail: 'Ask drivers to switch off.',
      factIds: ['test-factor'],
    };
    expect(communityActionSchema.safeParse(action).success).toBe(true);
    expect(communityActionSchema.safeParse({ ...action, factIds: [] }).success).toBe(false);
  });
});

describe('noticeSchema', () => {
  it('needs the notice in both English and Hindi', () => {
    const text = { title: 'Air today', lines: ['Keep windows shut until noon.'] };
    expect(
      noticeSchema.safeParse({ en: text, hi: { title: 'आज की हवा', lines: ['दोपहर तक खिड़कियाँ बंद रखें।'] } })
        .success,
    ).toBe(true);
    expect(noticeSchema.safeParse({ en: text }).success).toBe(false);
  });
});

describe('notice on the rules path', () => {
  const english = { title: 'Air today', lines: ['Keep windows shut until noon.'] };

  it('may carry English alone when no Hindi text written in code covers it', () => {
    expect(noticeSchema.safeParse({ en: english, hi: null }).success).toBe(true);
  });

  it('holds the model to both languages', () => {
    expect(noticeReplySchema.safeParse({ en: english, hi: null }).success).toBe(false);
    expect(
      noticeReplySchema.safeParse({ en: english, hi: { title: 'आज की हवा', lines: ['य'] } }).success,
    ).toBe(true);
  });
});
