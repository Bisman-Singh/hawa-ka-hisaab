// Tests for the compare strings: every topic comparePlans can name has a title and a reason.
import { describe, expect, it } from 'vitest';
import { TOPICS } from '../../../src/ui/compare/words.js';

describe('TOPICS', () => {
  it('names and explains each of the six topics', () => {
    expect(Object.keys(TOPICS).sort()).toEqual(
      ['indoor_steps', 'indoors', 'largest_cut', 'moved', 'protected', 'travel'].sort(),
    );
    expect(Object.values(TOPICS).every((topic) => topic.title !== '' && topic.why !== '')).toBe(true);
  });
});
