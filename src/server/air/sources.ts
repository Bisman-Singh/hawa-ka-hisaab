// The real air sources for the runtime: the station chain, Open-Meteo forecast and search, and the PIN table.
import { stationProviderSchema } from '../../features/air/schemas.js';
import type { AirSources } from '../../features/air/types.js';
import { UPSTREAM_BUDGET } from '../../config/limits.js';
import type { Clock } from '../../lib/clock.js';
import type { Fetcher } from '../../lib/http.js';
import { createUpstreamBudget } from './budget.js';
import { chainProviders } from './chain.js';
import { createCpcbProvider } from './cpcb.js';
import { createDataGovProvider } from './data-gov.js';
import { createOpenMeteoForecast, createOpenMeteoGeocoder } from './open-meteo.js';
import { createPinDirectory } from './pin-data.js';

/** Which station providers join the chain: the direct CPCB feed when on, data.gov.in when a key is set. */
export interface StationOptions {
  readonly directFeed: boolean;
  readonly dataGovKey: string | null;
}

/**
 * Builds every air source over one fetch function and clock. With neither station provider, readings are modelled.
 * Each upstream has its own call budget; forecast and search share Open-Meteo's.
 */
export function createAirSources(fetcher: Fetcher, clock: Clock, options: StationOptions): AirSources {
  const { directFeed, dataGovKey } = options;
  const openMeteo = { fetcher, clock, budget: createUpstreamBudget(UPSTREAM_BUDGET.openMeteo, clock) };
  const dataGovIn = { fetcher, clock, budget: createUpstreamBudget(UPSTREAM_BUDGET.dataGovIn, clock) };
  const direct = directFeed ? [createCpcbProvider(fetcher, clock)] : [];
  const dataGov = dataGovKey === null ? [] : [createDataGovProvider({ ...dataGovIn, apiKey: dataGovKey })];
  return {
    stations: chainProviders([...direct, ...dataGov]),
    stationProviders: stationProviderSchema.options.filter((name) =>
      name === 'cpcb_feed' ? directFeed : dataGovKey !== null,
    ),
    forecast: createOpenMeteoForecast(openMeteo),
    geocoder: createOpenMeteoGeocoder(openMeteo),
    pins: createPinDirectory(),
  };
}
