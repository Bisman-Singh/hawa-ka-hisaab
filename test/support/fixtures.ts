// Paths to and readers for the saved fixtures.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Absolute path of the CPCB fixture: seven real stations cut from a saved feed of 24 Nov 2026, 22:00 IST. */
export const CPCB_FIXTURE_PATH = fileURLToPath(new URL('./fixtures/cpcb-feed.xml', import.meta.url));

/** The CPCB fixture as text, exactly as the feed served it. */
export function readCpcbFixture(): string {
  return readFileSync(CPCB_FIXTURE_PATH, 'utf8');
}
