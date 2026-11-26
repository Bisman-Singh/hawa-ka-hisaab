// Every string the shared components show, in one place. The interface is English; Hindi appears only in
// generated content, which the language helper marks with lang="hi".
import type { AqiBand } from '../../features/naqi/types.js';
import type { ApiCallFailure } from '../api-client.js';

/** Strings of the frame and the shared components. */
export const UI = {
  skip: 'Skip to content',
  markHindi: 'हवा का हिसाब',
  markTag: ', the account of the air',
  credits: {
    cpcb: 'Air readings come from the Central Pollution Control Board CAAQMS feed.',
    meteoBefore: 'Forecasts and modelled estimates: Weather data by ',
    meteoLink: 'Open-Meteo.com',
    meteoAfter: ', CC BY 4.0.',
    geoBefore: 'PIN code places: ',
    geoLink: 'GeoNames (geonames.org)',
    geoAfter: ', CC BY 4.0.',
    samples: 'Sample households are made up.',
  },
  working: 'Show the working',
  close: 'Close',
  retry: 'Try again',
  done: 'Done',
  now: 'Now',
  loadingView: 'Loading this page',
  offline: { title: 'You are offline', body: 'New readings and plans need a connection.' },
  broken: {
    title: 'This part of the page stopped working.',
    body: 'Your household and place are still saved.',
  },
  notFound: { title: 'Page not found', body: 'There is no page at this address.', home: 'Go to the start' },
  stamp: {
    model: 'Wording by Gemini',
    rules: 'Wording by fixed rules',
    fixed_reply: 'Fixed reply, written in advance',
  },
  legend: {
    summary: 'What the six bands mean',
    caption: 'CPCB AQI bands and health statements',
    head: { band: 'Band', range: 'AQI', statement: 'CPCB health statement' },
    cite: 'CPCB, National Air Quality Index, Table 3.12.',
    link: 'Open the report',
  },
};

/** Words for one band: its name, its place on the scale and CPCB's health statement. */
export interface BandText {
  readonly name: string;
  readonly ordinal: string;
  readonly statement: string;
}

/** Name and CPCB health statement of each band, quoted from CPCB's National Air Quality Index report. */
export const BAND_TEXT: Readonly<Record<AqiBand, BandText>> = {
  good: { name: 'Good', ordinal: 'first', statement: 'Minimal Impact' },
  satisfactory: {
    name: 'Satisfactory',
    ordinal: 'second',
    statement: 'May cause minor breathing discomfort to sensitive people',
  },
  moderate: {
    name: 'Moderate',
    ordinal: 'third',
    statement:
      'May cause breathing discomfort to the people with lung disease such as asthma and discomfort to people with heart disease, children and older adults',
  },
  poor: {
    name: 'Poor',
    ordinal: 'fourth',
    statement:
      'May cause breathing discomfort to people on prolonged exposure and discomfort to people with heart disease with short exposure',
  },
  very_poor: {
    name: 'Very Poor',
    ordinal: 'fifth',
    statement:
      'May cause respiratory illness to the people on prolonged exposure. Effect may be more pronounced in people with lung and heart diseases',
  },
  severe: {
    name: 'Severe',
    ordinal: 'sixth',
    statement:
      'May cause respiratory effects even on healthy people and serious health impacts on people with lung/heart diseases. The health impacts may be experienced even during light physical activity',
  },
};

/** The sentence a screen reader hears for the band scale, such as "AQI 342 is in the fifth of six bands, ...". */
export function scaleSentence(aqi: number, band: AqiBand, range: string): string {
  const { name, ordinal } = BAND_TEXT[band];
  return `AQI ${String(aqi)} is in the ${ordinal} of six bands, ${name}, ${range}.`;
}

/** A title and a next step for a failed request, in plain words. */
export interface FailureText {
  readonly title: string;
  readonly body: string;
}

const FAILURES: Readonly<Record<ApiCallFailure['kind'], FailureText>> = {
  network: { title: 'No connection', body: 'Check the connection and try again.' },
  aborted: { title: 'The request was stopped', body: 'Try again when you are ready.' },
  invalid_input: { title: 'Something in the form is not right', body: 'Check the fields and send again.' },
  invalid_response: { title: 'The answer could not be read', body: 'Try again in a moment.' },
  http: { title: 'The server did not answer properly', body: 'Try again in a moment.' },
  api: { title: 'The server could not do this', body: 'Try again in a moment.' },
};

/** Words for a failed request. A rate limit names the wait when the server gave one. */
export function failureText(failure: ApiCallFailure): FailureText {
  if (failure.kind === 'api' && failure.code === 'rate_limited') {
    const wait =
      failure.retryAfterSeconds === null ? 'a minute' : `${String(failure.retryAfterSeconds)} seconds`;
    return { title: 'Too many requests from this browser', body: `Try again in ${wait}.` };
  }
  if (failure.kind === 'api' && failure.code === 'upstream_unavailable') {
    return { title: 'A data source did not answer', body: 'Try again in a moment.' };
  }
  return FAILURES[failure.kind];
}
