// Tests that zod is set to parse without generated code, so it never probes for eval under the page policy.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('zod setup', () => {
  it('turns on jitless before any schema is built, so the eval probe never runs', async () => {
    await import('../../src/ui/zod-setup.js');
    expect(z.config().jitless).toBe(true);
    z.strictObject({ place: z.string() }).parse({ place: 'Lucknow' });
    expect(Object.getOwnPropertyDescriptor(z.util.allowsEval, '_getter')?.value).toBeTypeOf('function');
  });
});
