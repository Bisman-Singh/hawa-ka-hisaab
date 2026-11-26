// Words of the place search and the air card. Names, numbers and hours come from the data, never from here.
import { STATION_RADIUS_KM } from '../../config/limits.js';
import type { GrapNotice, ModelledReading, UnavailableReading } from '../../features/air/types.js';
import type { PollutantId } from '../../features/naqi/types.js';

const RADIUS = `${String(STATION_RADIUS_KM)} km`;

/** Fixed text of the place field and the device location states. */
export const PLACE = {
  title: "Today's air for your place",
  lede: "The official air reading for your place, and a plan for your household's day. Every figure shows its working.",
  heading: 'Your place',
  label: 'City, town or PIN code',
  hint: 'Any place in India.',
  find: 'Find',
  finding: 'Finding places',
  choose: 'Which place do you mean?',
  locate: 'Use my location',
  asking: 'Asking the browser for your location',
  yourLocation: 'your location',
  rounded: 'From this device, rounded to about a kilometre before it is used.',
  blank: 'Type a city, town or PIN code first.',
  notFound: (query: string): readonly [string, string] =>
    /^\d{6}$/.test(query.replace(/\s+/g, ''))
      ? [`No place found for PIN ${query}.`, 'Check the six digits, or type the town.']
      : [`No place in India matches \u201c${query}\u201d.`, 'Check the spelling, or try a PIN code.'],
  denied: {
    title: 'Location is turned off for this site',
    body: 'Type your city, town or PIN code instead. To allow location later, open the site settings from the icon beside the address bar.',
  },
  unavailable: {
    title: 'Your location could not be found',
    body: 'Type your city, town or PIN code instead.',
  },
  outside: {
    title: 'This location is outside India',
    body: 'Readings here cover places in India. Type a city, town or PIN code in India.',
  },
};

/** Fixed text of the air card and its states. */
export const AIR = {
  heading: "Today's air",
  start: {
    title: 'Start with your place',
    body: `The air card shows the reading from the nearest CPCB station. If none is within ${RADIUS}, it shows a model estimate and says so.`,
  },
  loading: (where: string): string => `Reading the air for ${where}`,
  station: 'Station reading',
  cpcbAqi: 'CPCB AQI',
  main: 'Main pollutant',
  subHeading: 'Hourly sub-index by pollutant',
  subNote: 'CPCB hourly sub-index, not the AQI.',
  mainMark: ', main pollutant',
  noHourly: 'CPCB published no hourly sub-index for this station.',
  stale: 'This reading is stale',
  staleBody: (hour: string, age: string): string =>
    `It is for ${hour}, ${age} ago. CPCB has not published a newer one. The plan treats it as old.`,
  down: 'The CPCB feed did not answer',
  downBody: (hour: string): string => `Showing the last good reading, from ${hour}.`,
  retry: 'Try again',
  modelled: 'Modelled estimate',
  modelledLabel:
    'Modelled estimate from CAMS via Open-Meteo. Not a measurement. It tends to read low in cities.',
  estimated: 'Estimated index',
  orMore: 'meaning 401 or more',
  ledBy: 'Led by',
  modelHeading: 'Model values behind the estimate',
  modelNote: 'Trailing 24 hour means in µg/m³. Ozone and CO are 8 hour means, CO in mg/m³.',
  insufficient: 'The model gave too few pollutants for an index, so none is shown.',
  unavailable: 'The air reading could not be fetched',
  grapLead: 'GRAP, Delhi NCR only.',
};

/** The GRAP stages in force, cumulative as CAQM orders them. */
export const GRAP_STAGES: Readonly<Record<GrapNotice['stage'], string>> = {
  none: 'No GRAP stage is in force',
  I: 'Stage I is in force',
  II: 'Stages I and II are in force',
  III: 'Stages I to III are in force',
  IV: 'Stages I to IV are in force',
};

/** Why the modelled path is used, in words. km is the nearest station of any kind, when known. */
export function modelledWhy(reason: ModelledReading['reason'], km: number | null): string {
  if (reason === 'feed_unavailable') {
    return 'The CPCB feed did not answer, and no earlier reading is saved for this place.';
  }
  if (reason === 'no_station_reading') {
    return `No CPCB station within ${RADIUS} published a reading this hour.`;
  }
  const nearest = km === null ? '' : ` The nearest is ${km.toFixed(0)} km away.`;
  return `No CPCB station within ${RADIUS}.${nearest}`;
}

/** Why neither a station nor the model answered, in words. */
export const UNAVAILABLE_WHY: Readonly<Record<UnavailableReading['reason'], string>> = {
  feed_and_model_down: 'The CPCB feed and the model did not answer, and no earlier reading is saved.',
  no_station_and_model_down: `No CPCB station is within ${RADIUS}, and the model did not answer.`,
};

/** Pollutant names as CPCB writes them, with subscript digits. */
export const POLLUTANT_NAME: Readonly<Record<PollutantId, string>> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  so2: 'SO₂',
  co: 'CO',
  o3: 'Ozone',
  nh3: 'NH₃',
};
