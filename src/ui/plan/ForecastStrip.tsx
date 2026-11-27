// The forecast strip: modelled PM2.5 for each hour of the plan's day from the curve the server planned with, the
// airing window and the planning time marked, a stepper, a hidden table and the credit the forecast's licence asks.
import { Button } from '../components/Button.js';
import { type ReactElement, useId, useState } from 'react';
import type { HourCurve } from '../../features/air/types.js';
import { clockOf } from '../../lib/time.js';
import { dayCurve } from '../../features/ledger/curve.js';
import type { AirBasis, Plan, WhatIfContext } from '../../features/planner/types.js';
import { Credit } from '../components/Credit.js';
import { HourTable } from './HourTable.js';
import { Chart, type StripHour, type StripPartProps } from './StripChart.js';
import { STRIP } from './words.js';
import { calling } from '../handlers.js';

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
      <Button disabled={selected === 0} onClick={calling(onSelect, Math.max(0, selected - 1))}>
        {arrow('M13 4L6 10L13 16Z')}
        <span className="vh">{STRIP.earlier}</span>
      </Button>
      <output aria-live="polite">
        {hours
          .slice(selected, selected + 1)
          .map((hour) => `${clockOf(hour.hour * 60)}, ${STRIP.pm25} ${String(hour.pm25)} ${STRIP.unit}`)
          .join('')}
      </output>
      <Button disabled={selected === last} onClick={calling(onSelect, Math.min(last, selected + 1))}>
        {arrow('M7 4L14 10L7 16Z')}
        <span className="vh">{STRIP.later}</span>
      </Button>
    </div>
  );
}

/** Why there is no strip: no forecast for the place today, or a plan that came without the one it used. */
export function stripNote(basis: AirBasis, curve: HourCurve | null): string {
  return basis.forecastIssuedAt === null || curve !== null ? STRIP.noForecast : STRIP.notSent;
}

/** Props of the strip: the plan, its air basis and the forecast and time the server planned with. */
export interface ForecastStripProps {
  readonly plan: Plan;
  readonly basis: AirBasis;
  readonly whatIf: WhatIfContext;
}

function StripBody({
  hours,
  plan,
  madeAt,
}: {
  readonly hours: readonly StripHour[];
  readonly plan: Plan;
  readonly madeAt: string | null;
}): ReactElement {
  const [selected, setSelected] = useState(() => {
    const values = hours.map((hour) => hour.pm25);
    return values.indexOf(Math.min(...values));
  });
  return (
    <>
      <Chart hours={hours} plan={plan} selected={selected} madeAt={madeAt} />
      <Stepper hours={hours} selected={selected} onSelect={setSelected} />
      <HourTable hours={hours} />
    </>
  );
}

/** The strip from the plan's own forecast, or why there is none. */
export function ForecastStrip({ plan, basis, whatIf }: ForecastStripProps): ReactElement {
  const id = useId();
  const { curve, notBefore } = whatIf;
  const hours = curve === null ? [] : stripHours(curve, plan.date);
  return (
    <section className="ds" aria-labelledby={id}>
      <h2 id={id}>{STRIP.title}</h2>
      {hours.length === 0 ? (
        <p>{stripNote(basis, curve)}</p>
      ) : (
        <>
          <p>
            {STRIP.about} <Credit id="credit-open-meteo" />
          </p>
          <StripBody key={curve?.issuedAt} hours={hours} plan={plan} madeAt={notBefore} />
        </>
      )}
    </section>
  );
}
