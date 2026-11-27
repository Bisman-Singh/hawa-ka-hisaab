// Tests for cleaning upstream names: hidden and bidi characters go, spacing is tidied, the words stay.
import { describe, expect, it } from 'vitest';
import { cleanName } from '../../src/lib/clean-text.js';

describe('cleanName', () => {
  it('removes control, format and bidi characters and tidies the spacing', () => {
    expect(cleanName('Station ‮evil‬ \u0007')).toBe('Station evil');
    expect(cleanName('  JNU, Delhi​ - DPCC \n')).toBe('JNU, Delhi - DPCC');
    expect(cleanName('Ｓector 62')).toBe('Sector 62');
  });

  it('leaves an ordinary name and its length as they are, so the schema still decides', () => {
    expect(cleanName('Mandir Marg, Delhi - DPCC')).toBe('Mandir Marg, Delhi - DPCC');
    expect(cleanName('x'.repeat(300))).toHaveLength(300);
  });
});
