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

  it('holds the model to both languages, each worded by action id', () => {
    const worded = {
      title: 'Air today',
      actions: [{ id: 'windows', text: 'Keep windows shut until noon.' }],
    };
    const hindi = { title: 'आज की हवा', actions: [{ id: 'windows', text: 'य' }] };
    expect(noticeReplySchema.safeParse({ en: worded, hi: null }).success).toBe(false);
    expect(noticeReplySchema.safeParse({ en: worded, hi: hindi }).success).toBe(true);
    expect(noticeReplySchema.safeParse({ en: english, hi: hindi }).success).toBe(false);
  });

  it('refuses the same action id twice in one language', () => {
    const line = { id: 'windows', text: 'Keep windows shut.' };
    const twice = { title: 'Air today', actions: [line, line] };
    const once = { title: 'आज की हवा', actions: [{ id: 'windows', text: 'य' }] };
    const result = noticeReplySchema.safeParse({ en: twice, hi: once });
    expect(result.error?.issues[0]?.message).toBe('action ids must be unique');
  });

  it('lets a notice carry up to fourteen lines, for twelve actions and the two frame lines', () => {
    const lines = (count: number): string[] => Array.from({ length: count }, () => 'A line.');
    expect(noticeSchema.safeParse({ en: { title: 'Air', lines: lines(14) }, hi: null }).success).toBe(true);
    expect(noticeSchema.safeParse({ en: { title: 'Air', lines: lines(15) }, hi: null }).success).toBe(false);
  });
});

describe('optional headcounts', () => {
  it('accepts counts of children, older adults and outdoor staff for a society, and leaves them optional', () => {
    const counts = { children: 40, olderAdults: 25, outdoorStaff: 6 };
    expect(communityInputSchema.safeParse({ ...sampleCommunity(), ...counts }).success).toBe(true);
    expect(communityInputSchema.safeParse({ ...sampleCommunity(), children: null }).success).toBe(true);
    expect(communityInputSchema.safeParse({ ...sampleCommunity(), children: -1 }).success).toBe(false);
  });

  it('keeps child and older adult counts off a school, which gives pupils, but allows its outdoor staff', () => {
    const school = { ...sampleCommunity(), kind: 'school', homes: null, pupils: 300 };
    expect(communityInputSchema.safeParse({ ...school, outdoorStaff: 5 }).success).toBe(true);
    const result = communityInputSchema.safeParse({ ...school, olderAdults: 0 });
    expect(result.error?.issues[0]?.message).toBe(
      'child and older adult counts are for a housing society; a school gives pupils',
    );
    expect(communityInputSchema.safeParse({ ...school, children: 12 }).success).toBe(false);
  });
});
