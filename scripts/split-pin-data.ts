// Copies the PIN tables into the server data folder, cutting the two large ones into parts under the file cap.
// Usage: tsx scripts/split-pin-data.ts <folder holding pin_centres.json, pin_labels.json, pin_prefixes.json> <out>
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

/** Largest part written, in bytes, kept under the repository cap of 64,000 bytes a file. */
export const PART_BYTES = 60_000;

const tableSchema = z.record(z.string(), z.unknown());

/** Cuts a table into parts in key order, each under maxBytes once written as JSON. Values are kept as they are. */
export function splitTable(
  table: Readonly<Record<string, unknown>>,
  maxBytes: number,
): Record<string, unknown>[] {
  const parts: Record<string, unknown>[] = [];
  let current: Record<string, unknown> = {};
  let size = 2;
  for (const [key, value] of Object.entries(table)) {
    const entry = Buffer.byteLength(`${JSON.stringify(key)}:${JSON.stringify(value)},`);
    if (size + entry > maxBytes && Object.keys(current).length > 0) {
      parts.push(current);
      current = {};
      size = 2;
    }
    current[key] = value;
    size += entry;
  }
  return Object.keys(current).length > 0 ? [...parts, current] : parts;
}

function writeParts(source: string, out: string, name: string): number {
  const raw: unknown = JSON.parse(readFileSync(join(source, `pin_${name}.json`), 'utf8'));
  const parts = splitTable(tableSchema.parse(raw), PART_BYTES);
  parts.forEach((part, index) => {
    writeFileSync(join(out, `${name}-${String(index + 1)}.json`), JSON.stringify(part));
  });
  return parts.length;
}

const [source, out] = process.argv.slice(2);
if (source === undefined || out === undefined) {
  console.error('Usage: tsx scripts/split-pin-data.ts <source folder> <output folder>');
  process.exitCode = 1;
} else {
  const centres = writeParts(source, out, 'centres');
  const labels = writeParts(source, out, 'labels');
  copyFileSync(join(source, 'pin_prefixes.json'), join(out, 'prefixes.json'));
  console.log(`Wrote ${String(centres)} centre parts, ${String(labels)} label parts and prefixes.json`);
}
