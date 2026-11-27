// Member helpers: who the health ministry advisory counts as vulnerable, and plain words for each member.
import type { AgeGroup, Household, Member, MemberFlag } from './types.js';

const VULNERABLE_AGES: ReadonlySet<AgeGroup> = new Set(['infant', 'child', 'teen', 'older_adult']);

/**
 * True for members the advisory counts as vulnerable: children (teens included), older people, pregnant women,
 * people with heart or lung conditions and people who work outdoors. Every member flag is one of those groups.
 */
export function isVulnerable(member: Member): boolean {
  return VULNERABLE_AGES.has(member.ageGroup) || member.flags.length > 0;
}

/** The members with these ids, in household order. */
export function membersOf(household: Household, ids: readonly string[]): Member[] {
  return household.members.filter((member) => ids.includes(member.id));
}

/** True for infants and children, for whom no mask study measured protection. */
export function isYoungChild(member: Member): boolean {
  return member.ageGroup === 'infant' || member.ageGroup === 'child';
}

const AGE_WORD: Readonly<Record<AgeGroup, string>> = {
  infant: 'baby',
  child: 'child',
  teen: 'teen',
  adult: 'adult',
  older_adult: 'older adult',
};

const FLAG_WORDS: Readonly<Record<Exclude<MemberFlag, 'pregnant'>, string>> = {
  asthma_or_lung: 'with asthma or a lung condition',
  heart_condition: 'with a heart condition',
  outdoor_worker: 'who works outdoors',
};

/** A member in plain words without an article, such as "child with asthma or a lung condition". */
export function describeMember(member: Member): string {
  const base = member.flags.includes('pregnant')
    ? `pregnant ${AGE_WORD[member.ageGroup]}`
    : AGE_WORD[member.ageGroup];
  const extras = member.flags.flatMap((flag) => (flag === 'pregnant' ? [] : [FLAG_WORDS[flag]]));
  return extras.length === 0 ? base : `${base} ${extras.join(' and ')}`;
}
