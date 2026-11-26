// Station providers tried in order, first fresh copy wins: the CPCB feed, then data.gov.in when a key is set.
// With none fresh, the newest last good copy is served; with none at all, the modelled path takes over.
import type { AirProvider, StationFeedRead } from '../../features/air/types.js';

function newer(current: StationFeedRead | null, next: StationFeedRead): StationFeedRead {
  if (current === null || current.kind === 'miss') {
    return next;
  }
  return next.kind === 'last_good' && next.feed.feedHour > current.feed.feedHour ? next : current;
}

/** Chains providers. Each keeps its own cache, so one that is failing is skipped quickly until it is retried. */
export function chainProviders(providers: readonly AirProvider[]): AirProvider {
  return {
    readStations: async (near) => {
      let best: StationFeedRead | null = null;
      for (const provider of providers) {
        const read = await provider.readStations(near);
        if (read.kind === 'fresh') {
          return read;
        }
        best = newer(best, read);
      }
      return best ?? { kind: 'miss', failure: { kind: 'network' } };
    },
  };
}
