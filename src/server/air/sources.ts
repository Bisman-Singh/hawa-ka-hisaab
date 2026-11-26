// The real air sources for the runtime: the station chain, Open-Meteo forecast and search, and the PIN table.
import type { AirSources } from '../../features/air/types.js';
import type { Clock } from '../../lib/clock.js';
import type { Fetcher } from '../../lib/http.js';
import { chainProviders } from './chain.js';
import { createCpcbProvider } from './cpcb.js';
import { createDataGovProvider } from './data-gov.js';
import { createOpenMeteoForecast, createOpenMeteoGeocoder } from './open-meteo.js';
import { createPinDirectory } from './pin-data.js';

/** Builds every air source over one fetch function and clock. data.gov.in joins the chain only with a key. */
export function createAirSources(fetcher: Fetcher, clock: Clock, dataGovKey: string | null): AirSources {
  const dataGov = dataGovKey === null ? [] : [createDataGovProvider({ fetcher, clock, apiKey: dataGovKey })];
  return {
    stations: chainProviders([createCpcbProvider(fetcher, clock), ...dataGov]),
    forecast: createOpenMeteoForecast(fetcher, clock),
    geocoder: createOpenMeteoGeocoder(fetcher),
    pins: createPinDirectory(),
  };
}
