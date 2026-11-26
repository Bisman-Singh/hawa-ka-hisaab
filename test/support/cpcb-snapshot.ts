// The saved CPCB feed of 24 Nov 2026, 22:00 IST, all 575 stations, cut by city into parts under the file cap.
// Each part is a complete feed document; every Station block in it is a byte for byte cut of the saved feed.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FOLDER = fileURLToPath(new URL('./fixtures/cpcb-snapshot/', import.meta.url));

/** Every part of the snapshot as text, in part order. */
export function readCpcbSnapshotParts(): string[] {
  return readdirSync(FOLDER)
    .filter((name) => /^part-\d+\.xml$/.test(name))
    .sort((a, b) => Number(/\d+/.exec(a)?.[0]) - Number(/\d+/.exec(b)?.[0]))
    .map((name) => readFileSync(`${FOLDER}${name}`, 'utf8'));
}
