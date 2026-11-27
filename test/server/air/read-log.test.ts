// Tests that a station read which is not fresh is logged by kind and status, and a fresh one is not.
import { describe, expect, it } from 'vitest';
import type { StationFeedRead } from '../../../src/features/air/types.js';
import { withReadLog } from '../../../src/server/air/read-log.js';
import { createCaptureLogger } from '../../support/capture-logger.js';
import { jnuStation, stationFeed } from '../../support/fake-air.js';
import { createFakeClock } from '../../support/fake-clock.js';

async function logged(
  read: StationFeedRead,
): Promise<{ readonly result: StationFeedRead; readonly text: string }> {
  const capture = createCaptureLogger(createFakeClock());
  const provider = withReadLog({ readStations: () => Promise.resolve(read) }, capture.logger);
  return { result: await provider.readStations({ lat: 28.6, lon: 77.2 }), text: capture.text() };
}

describe('withReadLog', () => {
  it('passes a fresh read through without a line', async () => {
    const read: StationFeedRead = { kind: 'fresh', feed: stationFeed([jnuStation()]) };
    const { result, text } = await logged(read);
    expect(result).toBe(read);
    expect(text).toBe('');
  });

  it('logs a miss with the failure kind and the HTTP status', async () => {
    const { result, text } = await logged({ kind: 'miss', failure: { kind: 'status', status: 429 } });
    expect(result.kind).toBe('miss');
    expect(text).toContain('"event":"station_read_failed"');
    expect(text).toContain('"code":"miss:status"');
    expect(text).toContain('"status":429');
  });

  it('logs a last good read with its failure kind and no status', async () => {
    const read: StationFeedRead = {
      kind: 'last_good',
      feed: stationFeed([jnuStation()]),
      failure: { kind: 'timeout' },
    };
    const { text } = await logged(read);
    expect(text).toContain('"code":"last_good:timeout"');
    expect(text).not.toContain('"status"');
  });
});
