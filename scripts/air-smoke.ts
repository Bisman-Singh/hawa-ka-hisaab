// Live check of the air routes against the real CPCB feed and Open-Meteo, for five places across India. With
// DATA_GOV_IN_API_KEY in the environment it runs them again on data.gov.in alone. Not part of the gate.
import { airResponseSchema, placesResponseSchema } from '../src/features/air/contract.js';
import type { AirResponse } from '../src/features/air/types.js';
import { createApp } from '../src/server/app.js';
import { createRuntimeDeps } from '../src/server/runtime.js';
import { createDataGovProvider } from '../src/server/air/data-gov.js';

const runtime = createRuntimeDeps(process.env);
const apiKey = process.env['DATA_GOV_IN_API_KEY'] ?? '';
const dataGovOnly = createDataGovProvider({ fetcher: globalThis.fetch, clock: runtime.clock, apiKey });
let app = createApp(runtime);
const round = (value: number): string => value.toFixed(2);

function context(body: AirResponse): string {
  const feed = `feed ${body.feed.fetch} hour ${body.feed.feedHour ?? 'none'}${body.feed.stale ? ' stale' : ''}`;
  const grap = body.grap ? `${body.grap.stage} by order of ${body.grap.orderDate}` : 'not shown';
  return `${feed}; curve ${String(body.forecast?.hours.length ?? 0)} hours, GRAP ${grap}`;
}

function station(reading: Extract<AirResponse['reading'], { path: 'station' }>): string {
  const aqi = reading.aqi ? `AQI ${String(reading.aqi.value)} ${reading.aqi.band}` : 'no AQI published';
  return `station ${reading.station.name}, ${String(reading.distanceKm)} km, ${aqi}, hour ${reading.readingHour}, via ${reading.provider ?? 'unknown'}`;
}

function modelled(reading: Extract<AirResponse['reading'], { path: 'modelled' }>): string {
  const estimate =
    reading.estimate.status === 'computed'
      ? `estimate ${String(reading.estimate.value)} ${reading.estimate.band}`
      : `no estimate, ${reading.estimate.reason}`;
  return `modelled, ${reading.reason}, nearest station ${String(reading.nearestStationKm ?? 'none')} km, ${estimate}`;
}

/** One line about the reading, the feed, the curve and GRAP. */
export function describeAir(body: AirResponse): string {
  const reading = body.reading;
  if (reading.path === 'station') {
    return `${station(reading)}; ${context(body)}`;
  }
  return reading.path === 'modelled'
    ? `${modelled(reading)}; ${context(body)}`
    : `unavailable, ${reading.reason}; ${context(body)}`;
}

async function airAt(lat: number, lon: number): Promise<string> {
  const response = await app.request(`/api/air?lat=${round(lat)}&lon=${round(lon)}`);
  return response.ok
    ? describeAir(airResponseSchema.parse(await response.json()))
    : `HTTP ${String(response.status)}`;
}

async function search(query: string): Promise<string> {
  const response = await app.request(`/api/places?q=${encodeURIComponent(query)}`);
  const places = response.ok ? placesResponseSchema.parse(await response.json()).places : [];
  const place = places[0];
  if (!place) {
    return `${query}: HTTP ${String(response.status)}, ${String(places.length)} places`;
  }
  const rough = place.roughness
    ? `, rough ${String(place.roughness.spreadKm)} km over ${String(place.roughness.pins)} PINs`
    : '';
  return `${query}: ${place.label ?? place.name} [${place.resolution ?? 'search'}${rough}] at ${round(place.lat)}, ${round(place.lon)}\n  ${await airAt(place.lat, place.lon)}`;
}

async function run(label: string): Promise<void> {
  const started = Date.now();
  console.log(`== ${label}`);
  console.log(`Delhi, Connaught Place 28.63, 77.22\n  ${await airAt(28.63, 77.22)}`);
  for (const query of ['Mumbai', 'Malkanagiri', 'Shillong', '110092']) {
    console.log(await search(query));
  }
  console.log(`Done in ${String(Date.now() - started)} ms`);
}

await run('station chain as configured');
if (apiKey !== '') {
  app = createApp({ ...runtime, air: { ...runtime.air, stations: dataGovOnly } });
  await run('data.gov.in alone');
}
