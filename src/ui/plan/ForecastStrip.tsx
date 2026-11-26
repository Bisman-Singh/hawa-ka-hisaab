// The forecast strip: modelled PM2.5 for each hour of the plan's day as bars, with the airing window and the time
// now marked, a stepper that reads one hour at a time, and a hidden table with every value for screen readers.
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import type { HourCurve } from '../../features/air/types.js';
import { clockText } from '../../features/community/format.js';
import { dayCurve } from '../../features/ledger/curve.js';
import type { AirBasis, Plan } from '../../features/planner/types.js';
import { Chart, HourTable } from './StripChart.js';
import type { StripHour, StripPartProps } from './StripChart.js';
import { STRIP } from './strings.js';
import { calling } from './handlers.js';

const FIRST_HOUR = 5;
const DAY_HOURS = Array.from({ length: 19 }, (_, index) => index + FIRST_HOUR);

/** The hours from 05 to 23 of the plan's date that the forecast covers. */
export function stripHours(curve: HourCurve, date: string): StripHour[] {
  const day = dayCurve(curve, date);
  return DAY_HOURS.flatMap((hour) => {
    const pm25 = day.get(hour);
    return pm25 === undefined ? [] : [{ hour, pm25 }];
  });
}

/** The stepper: earlier and later hour buttons around the hour being read, announced as it changes. */
export function Stepper({
  hours,
  selected,
  onSelect,
}: StripPartProps & { readonly onSelect: (index: number) => void }): ReactElement {
  const last = hours.length - 1;
  const arrow = (d: string): ReactElement => (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  );
  return (
    <div className="ds-step">
      <button
        className="btn btn-quiet"
        type="button"
        disabled={selected === 0}
        onClick={calling(onSelect, Math.max(0, selected - 1))}
      >
        {arrow('M13 4L6 10L13 16Z')}
        <span className="vh">{STRIP.earlier}</span>
      </button>
      <output aria-live="polite">
        {hours
          .slice(selected, selected + 1)
          .map((hour) => `${clockText(hour.hour, 0)}, ${STRIP.pm25} ${String(hour.pm25)} ${STRIP.unit}`)
          .join('')}
      </output>
      <button
        className="btn btn-quiet"
        type="button"
        disabled={selected === last}
        onClick={calling(onSelect, Math.min(last, selected + 1))}
      >
        {arrow('M7 4L14 10L7 16Z')}
        <span className="vh">{STRIP.later}</span>
      </button>
    </div>
  );
}

/** Why there is no strip, and whether the forecast on the page is not the one the plan was made with. */
export function stripNotes(basis: AirBasis, curve: HourCurve | null): { why: string; other: boolean } {
  const issued = basis.forecastIssuedAt;
  return {
    why: issued === null || curve !== null ? STRIP.noForecast : STRIP.notLoaded,
    other: issued !== null && curve !== null && curve.issuedAt !== issued,
  };
}

/** Props of the strip: the plan, its air basis and the forecast held on this page, if any. */
export interface ForecastStripProps {
  readonly plan: Plan;
  readonly basis: AirBasis;
  readonly curve: HourCurve | null;
}

function StripBody({
  hours,
  plan,
}: {
  readonly hours: readonly StripHour[];
  readonly plan: Plan;
}): ReactElement {
  const [selected, setSelected] = useState(() => {
    const values = hours.map((hour) => hour.pm25);
    return values.indexOf(Math.min(...values));
  });
  return (
    <>
      <Chart hours={hours} plan={plan} selected={selected} />
      <Stepper hours={hours} selected={selected} onSelect={setSelected} />
      <HourTable hours={hours} />
    </>
  );
}

/** The strip, or why there is none: no forecast for the place today, or none loaded on this page. */
export function ForecastStrip({ plan, basis, curve }: ForecastStripProps): ReactElement {
  const id = useId();
  const hours = curve === null ? [] : stripHours(curve, plan.date);
  const { why, other } = stripNotes(basis, curve);
  return (
    <section className="ds" aria-labelledby={id}>
      <h2 id={id}>{STRIP.title}</h2>
      {hours.length === 0 ? (
        <p>{why}</p>
      ) : (
        <>
          <p>{STRIP.about}</p>
          {other ? <p>{STRIP.otherCurve}</p> : null}
          <StripBody key={curve?.issuedAt} hours={hours} plan={plan} />
        </>
      )}
    </section>
  );
}
