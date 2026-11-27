// The forecast strip drawing: a bar per hour, the airing window, the planning time, the hour axis and the parts of
// the day. Sizes and positions reach the stylesheet as custom properties, as the page policy requires.
import { type ReactElement, useRef } from 'react';
import { fill } from '../../lib/template.js';
import { minutesOf } from '../../lib/time.js';
import { slotOf } from '../../features/planner/effects.js';
import type { Plan } from '../../features/planner/types.js';
import { useCssVars, type CssVars } from '../hooks/useCssVars.js';
import { SLOTS } from './plan-data.js';
import type { Language } from '../../lib/types.js';
import { PLAN, PLAN_LABELS, STRIP } from './words.js';

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

function Axis({ hours, selected, language }: StripPartProps & { readonly language: Language }): ReactElement {
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
      <div className="ds-slots" lang={language}>
        {SLOTS.map((slot) => {
          const span = hours.filter((hour) => slotOf(hour.hour * 60) === slot).length;
          const name = PLAN_LABELS[language].slots[slot];
          return span === 0 ? null : <Placed key={slot} vars={{ '--span': span }} text={name} />;
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
          text={`${STRIP.airing} ${fill(PLAN.hoursRange, { from: airing.start, to: airing.end })}`}
        />
      )}
      <ol className="ds-bars">
        {hours.map((hour, index) => (
          <Bar key={hour.hour} value={hour.pm25} selected={index === selected} />
        ))}
      </ol>
      <Axis hours={hours} selected={selected} language={plan.language} />
    </div>
  );
}
