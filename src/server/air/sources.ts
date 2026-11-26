// The real air sources for the runtime: the station chain, Open-Meteo forecast and search, and the PIN table.
import type { AirSources } from '../../features/air/types.js';
import type { Clock } from '../../lib/clock.js';
import type { Fetcher } from '../../lib/http.js';
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

/** Builds every air source over one fetch function and clock. With neither station provider, readings are modelled. */
export function createAirSources(fetcher: Fetcher, clock: Clock, options: StationOptions): AirSources {
  const { directFeed, dataGovKey } = options;
  const direct = directFeed ? [createCpcbProvider(fetcher, clock)] : [];
  const dataGov = dataGovKey === null ? [] : [createDataGovProvider({ fetcher, clock, apiKey: dataGovKey })];
  return {
    stations: chainProviders([...direct, ...dataGov]),
    forecast: createOpenMeteoForecast(fetcher, clock),
    geocoder: createOpenMeteoGeocoder(fetcher),
    pins: createPinDirectory(),
  };
}
