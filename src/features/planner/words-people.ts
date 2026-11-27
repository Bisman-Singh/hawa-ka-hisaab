// Plain words for the people a step is for, in English or Hindi. Hindi forms are the ones used before के लिए and को.
import { describeMember } from '../household/members.js';
import type { AgeGroup, Member, MemberFlag } from '../household/types.js';

/** One member in words, and the plural of each age group for a pair of the same age. */
export interface PeopleWords {
  readonly member: (member: Member) => string;
  readonly plural: Readonly<Record<AgeGroup, string>>;
}

const HI_AGE: Readonly<Record<AgeGroup, string>> = {
  infant: 'शिशु',
  child: 'बच्चे',
  teen: 'किशोर',
  adult: 'वयस्क',
  older_adult: 'बुजुर्ग',
};

const HI_FLAG: Readonly<Record<Exclude<MemberFlag, 'pregnant'>, string>> = {
  asthma_or_lung: 'दमा या फेफड़ों की बीमारी वाले',
  heart_condition: 'दिल की बीमारी वाले',
  outdoor_worker: 'बाहर काम करने वाले',
};

function hindiMember(member: Member): string {
  const base = member.flags.includes('pregnant') ? 'गर्भवती महिला' : HI_AGE[member.ageGroup];
  const flags = member.flags.flatMap((flag) => (flag === 'pregnant' ? [] : [HI_FLAG[flag]]));
  return [flags.join(' और '), base].filter((part) => part !== '').join(' ');
}

/** English words for people, the same as the household form uses. */
export const PEOPLE_EN: PeopleWords = {
  member: describeMember,
  plural: {
    infant: 'babies',
    child: 'children',
    teen: 'teens',
    adult: 'adults',
    older_adult: 'older adults',
  },
};

/** Hindi words for people. */
export const PEOPLE_HI: PeopleWords = {
  member: hindiMember,
  plural: {
    infant: 'शिशुओं',
    child: 'बच्चों',
    teen: 'किशोरों',
    adult: 'वयस्कों',
    older_adult: 'बुजुर्गों',
  },
};
