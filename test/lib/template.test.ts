// Tests for template filling: names fill from text or numbers, and an unknown name stays as written.
import { describe, expect, it } from 'vitest';
import { fill } from '../../src/lib/template.js';

describe('fill', () => {
  it('fills names from text and numbers and leaves an unknown name as written', () => {
    expect(fill('{size} less', { size: '8%' })).toBe('8% less');
    expect(fill('{count} of {max}', { count: 3, max: 2000 })).toBe('3 of 2000');
    expect(fill('{size} {missing}', { size: '2' })).toBe('2 {missing}');
  });
});
