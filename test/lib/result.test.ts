// Tests for the result helpers.
import { describe, expect, it } from 'vitest';
import { err, ok } from '../../src/lib/result.js';

describe('result', () => {
  it('wraps a value as a success', () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 });
  });

  it('wraps an error as a failure', () => {
    expect(err('timeout')).toEqual({ ok: false, error: 'timeout' });
  });
});
