// The placeholder values for one society or school on one day: facts, band, reading, timing, inputs and place.
// Each value carries the fact values behind the numbers it shows.
import type { AirReading } from '../air/types.js';
import type { AqiBand } from '../naqi/types.js';
import { factPlaceholders, factText } from './facts.js';
import { istParts, numeralsIn } from './format.js';
import { clockOf, clockValue, dateValue, listValue, numberValue, plain, shown } from './template-value.js';
import type { TemplateValue, TemplateValues } from './template-value.js';
import { BAND_EN } from './text-en.js';
import { ADVICE_HI, BAND_HI } from './text-hi.js';
import type { Timing } from './timing.js';
import type { CommunityContext, CommunityInput, DayBasis } from './types.js';

type Values = Record<string, TemplateValue>;

function bandValues(band: AqiBand | null): Values {
  if (band === null) {
    return {};
  }
  const slug = band.replace('_', '-');
  return {
    band: plain(BAND_EN[band], BAND_HI[band]),
    bandSlug: plain(slug),
    gen: plain(factText(`advice-${slug}-general`), ADVICE_HI[band].general),
    vuln: plain(factText(`advice-${slug}-vulnerable`), ADVICE_HI[band].vulnerable),
  };
}

function readingValues(reading: AirReading): Values {
  if (reading.path === 'unavailable') {
    return {};
  }
  const station = reading.path === 'station';
  const hour = istParts(Date.parse(station ? reading.readingHour : reading.modelHour));
  const aqi = station ? reading.aqi : reading.estimate.status === 'computed' ? reading.estimate : null;
  const name = station ? reading.station.name : '';
  const digits = numeralsIn(name).map((value) => ({
    id: 'air-station-name',
    label: 'number in the station name',
    value,
    unit: 'name',
  }));
  return {
    station: shown(name, digits),
    time: clockValue('air-reading-time', 'reading time', [hour.hour, hour.minute]),
    ...(aqi === null
      ? {}
      : { aqi: numberValue({ id: 'air-aqi', label: 'AQI', value: aqi.value, unit: 'AQI' }) }),
  };
}

function timingValues(community: CommunityInput, timing: Timing): Values {
  const period = (start: string): TemplateValue =>
    clockValue('input-outdoor-period', 'outdoor period start', clockOf(start));
  const worse = timing.periods.filter((item) => item.worse === true);
  const window = timing.window;
  return {
    ...(community.assembly === null
      ? {}
      : { assembly: clockValue('input-assembly', 'assembly time', clockOf(community.assembly)) }),
    periodTimes: listValue(timing.periods.map((item) => period(item.start))),
    worseTimes: listValue(worse.map((item) => period(item.start))),
    ...(window === null
      ? {}
      : {
          winStart: clockValue('forecast-cleaner-window', 'cleaner window start', [window.start, 0]),
          winEnd: clockValue('forecast-cleaner-window', 'cleaner window end', [window.end, 0]),
        }),
  };
}

type NumberRow = readonly [string, string, string, string, number];

const numbers = (rows: readonly NumberRow[]): Values =>
  Object.fromEntries(
    rows.map(([name, id, label, unit, value]) => [name, numberValue({ id, label, value, unit })]),
  );

function inputValues(community: CommunityInput): Values {
  const gate = community.gateIdling;
  const gateRows: readonly NumberRow[] =
    gate === null
      ? []
      : [
          ['vehicles', 'input-gate-vehicles', 'vehicles a day', 'vehicles', gate.vehiclesPerDay],
          ['minutes', 'input-idle-minutes', 'minutes each', 'minutes', gate.idleMinutes],
          [
            'vehicleMinutes',
            'computed-idling-vehicle-minutes',
            'vehicle-minutes a day',
            'vehicle-minutes',
            gate.vehiclesPerDay * gate.idleMinutes,
          ],
        ];
  return numbers([
    [
      'hours',
      'input-generator-hours',
      'generator hours a day',
      'hours',
      community.generator?.hoursPerDay ?? 0,
    ],
    ['staff', 'input-outdoor-staff', 'outdoor staff', 'people', community.outdoorStaff ?? 0],
    ...gateRows,
  ]);
}

function placeValues(context: CommunityContext, date: string): Values {
  const grap = context.grap;
  return {
    date: dateValue('notice-date', 'notice date', date),
    ...(grap === null
      ? {}
      : {
          stage: plain(grap.stage),
          grapFact: plain(grap.factId),
          orderDate: dateValue(grap.factId, 'GRAP order date', grap.orderDate),
        }),
  };
}

/** Every placeholder value for one context and day. */
export function templateValues(context: CommunityContext, day: DayBasis): TemplateValues {
  return {
    ...factPlaceholders(),
    ...bandValues(day.band),
    ...readingValues(context.reading),
    ...timingValues(context.community, day.timing),
    ...inputValues(context.community),
    ...placeValues(context, day.date),
  };
}
