// The drawing of the forecast strip: a bar per hour, the airing window and the time the plan was made, the hour
// axis and the parts of the day. Sizes and positions reach the stylesheet as custom properties, as the page policy requires.
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { clockText } from '../../features/community/format.js';
import { minutesOf } from '../../features/ledger/format.js';
import { slotOf } from '../../features/planner/effects.js';
import type { Plan } from '../../features/planner/types.js';
import { useCssVars } from '../hooks/useCssVars.js';
import type { CssVars } from '../hooks/useCssVars.js';
import { SLOTS } from './plan-data.js';
import { PLAN, STRIP } from './strings.js';

/** One hour of the strip: the hour of the day and its modelled PM2.5. */
export interface StripHour {
  readonly hour: number;
  readonly pm25: number;
}

/** Props shared by the parts of the strip. selected is the index of the hour the stepper reads. */
export interface StripPartProps {
  readonly hours: readonly StripHour[];
  readonly selected: number;
}

function Bar({ value, selected }: { readonly value: number; readonly selected: boolean }): ReactElement {
  const ref = useRef<HTMLLIElement>(null);
  useCssVars(ref, { '--v': value });
  return (
    <li ref={ref} className={selected ? 'sel' : undefined}>
      <span className="bar" />
    </li>
  );
}

/** A span whose position or width comes from code through CSS custom properties. */
function Placed({
  name,
  vars,
  text,
}: {
  readonly name?: string;
  readonly vars: CssVars;
  readonly text: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useCssVars(ref, vars);
  return (
    <span ref={ref} className={name}>
      {text}
    </span>
  );
}

function Axis({ hours, selected }: StripPartProps): ReactElement {
  return (
    <>
      <ol className="ds-axis">
        {hours.map((hour, index) => (
          <li
            key={hour.hour}
            className={index === selected ? 'sel' : hour.hour % 2 === 1 ? 'odd' : undefined}
          >
            {String(hour.hour).padStart(2, '0')}
          </li>
        ))}
      </ol>
      <div className="ds-slots">
        {SLOTS.map((slot) => {
          const span = hours.filter((hour) => slotOf(hour.hour * 60) === slot).length;
          return span === 0 ? null : <Placed key={slot} vars={{ '--span': span }} text={PLAN.slots[slot]} />;
        })}
      </div>
    </>
  );
}

/**
 * The bars, the airing window, when the plan was made, the hour axis and the parts of the day, hidden from screen
 * readers. madeAt is the IST time the server planned from, null for a whole-day plan.
 */
export function Chart(
  props: StripPartProps & { readonly plan: Plan; readonly madeAt: string | null },
): ReactElement {
  const { hours, selected, plan, madeAt } = props;
  const ref = useRef<HTMLDivElement>(null);
  useCssVars(ref, { '--hours': hours.length });
  const first = Math.min(...hours.map((hour) => hour.hour));
  const airing = plan.indoor.find((step) => step.topic === 'ventilation')?.window ?? null;
  const madeAtHour = madeAt === null ? -1 : minutesOf(madeAt) / 60 - first;
  return (
    <div ref={ref} className="ds-chart" aria-hidden="true">
      {madeAt !== null && madeAtHour >= 0 ? (
        <Placed name="ds-now" vars={{ '--at': madeAtHour }} text={`${STRIP.now} ${madeAt}`} />
      ) : null}
      {airing === null ? null : (
        <Placed
          name="ds-win"
          vars={{
            '--from': minutesOf(airing.start) / 60 - first,
            '--to': minutesOf(airing.end) / 60 - first,
          }}
          text={`${STRIP.airing} ${airing.start} ${PLAN.hoursTo} ${airing.end}`}
        />
      )}
      <ol className="ds-bars">
        {hours.map((hour, index) => (
          <Bar key={hour.hour} value={hour.pm25} selected={index === selected} />
        ))}
      </ol>
      <Axis hours={hours} selected={selected} />
    </div>
  );
}

/** Every hour and its value as a real table, for screen readers. */
export function HourTable({ hours }: { readonly hours: readonly StripHour[] }): ReactElement {
  return (
    <table className="vh">
      <caption>{STRIP.caption}</caption>
      <thead>
        <tr>
          <th scope="col">{STRIP.hour}</th>
          <th scope="col">{STRIP.pm25}</th>
        </tr>
      </thead>
      <tbody>
        {hours.map((hour) => (
          <tr key={hour.hour}>
            <td>{clockText(hour.hour, 0)}</td>
            <td>{hour.pm25}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
