// Logs each station read that is not fresh, by failure kind and HTTP status, so a failing source shows in the logs.
import type { AirProvider } from '../../features/air/types.js';
import type { Logger } from '../../lib/logger.js';

/** Wraps a station provider. The line carries codes only, never a URL, a key or a place. */
export function withReadLog(provider: AirProvider, logger: Logger): AirProvider {
  return {
    readStations: async (near) => {
      const read = await provider.readStations(near);
      if (read.kind !== 'fresh') {
        const { failure } = read;
        const status = failure.kind === 'status' ? { status: failure.status } : {};
        logger.warn('station_read_failed', {
          upstream: 'stations',
          code: `${read.kind}:${failure.kind}`,
          ...status,
        });
      }
      return read;
    },
  };
}
