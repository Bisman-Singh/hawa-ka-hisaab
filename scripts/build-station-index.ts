// Builds the station index the data.gov.in provider uses to find which states hold the stations near a point,
// from one full answer of that API saved as JSON. Usage: tsx scripts/build-station-index.ts <saved answer.json> <output.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

const answerSchema = z.object({
  records: z.array(
    z.object({ station: z.string(), state: z.string(), latitude: z.string(), longitude: z.string() }),
  ),
});

/** One entry per station name, sorted by name: [name, lat, lon, state]. */
export function stationIndex(answer: z.infer<typeof answerSchema>): [string, number, number, string][] {
  const byName = new Map<string, [string, number, number, string]>();
  for (const row of answer.records) {
    byName.set(row.station, [row.station, Number(row.latitude), Number(row.longitude), row.state]);
  }
  return [...byName.values()].sort((a, b) => a[0].localeCompare(b[0]));
}

const [source, out] = process.argv.slice(2);
if (source === undefined || out === undefined) {
  console.error('Usage: tsx scripts/build-station-index.ts <saved answer.json> <output.json>');
  process.exitCode = 1;
} else {
  const raw: unknown = JSON.parse(readFileSync(source, 'utf8'));
  const index = stationIndex(answerSchema.parse(raw));
  writeFileSync(out, JSON.stringify(index));
  console.log(`Wrote ${String(index.length)} stations`);
}
