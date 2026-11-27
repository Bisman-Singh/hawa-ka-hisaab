// Tests for the ask strings: the hint says medical questions are not sent to the model.
import { describe, expect, it } from 'vitest';
import { ASK } from '../../../src/ui/ask/words.js';

describe('ASK', () => {
  it('tells the reader before they ask that medical questions get a fixed reply', () => {
    expect(ASK.hint).toContain(
      'symptoms, medicines or diagnosis get a fixed reply and are not sent to the model',
    );
  });
});
