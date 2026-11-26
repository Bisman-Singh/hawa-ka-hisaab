// Sets zod to parse without generated code before any schema is built. The page policy forbids eval, and zod
// probes for it the first time it builds an object schema, which would put a policy violation in the console.
import { z } from 'zod';

z.config({ jitless: true });
