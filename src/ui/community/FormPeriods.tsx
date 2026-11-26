// The outdoor periods of the community form, one row each, and the samples the form can start from.
import type { ReactElement } from 'react';
import { COMMUNITY_SAMPLES } from '../../features/community/samples.js';
import { formFrom } from './community-form.js';
import type { CommunityForm } from './community-form.js';
import { LabelledInput } from './FormParts.js';
import type { Kit } from './FormParts.js';
import { COMMUNITY } from './strings.js';
import { calling } from '../plan/handlers.js';

/** Most outdoor periods the community schema accepts. */
export const MAX_PERIODS = 12;

type Period = CommunityForm['periods'][number];

/** One outdoor period: its start time, its minutes and a button that removes it. */
export function PeriodRow({ kit, index }: { readonly kit: Kit; readonly index: number }): ReactElement {
  const { form, set } = kit;
  const name = `${COMMUNITY.period} ${String(index + 1)}`;
  const change =
    (key: keyof Period) =>
    (value: string): void => {
      set({
        periods: form.periods.map((period, at) => (at === index ? { ...period, [key]: value } : period)),
      });
    };
  const own = form.periods.slice(index, index + 1);
  return (
    <div className="period">
      {own.map((period) => (
        <LabelledInput
          key="start"
          label={`${name}, ${COMMUNITY.periodStart}`}
          kind="time"
          value={period.start}
          onText={change('start')}
          {...(index === 0 ? { id: kit.idOf('periods'), ...kit.errorOf('periods') } : {})}
        />
      ))}
      {own.map((period) => (
        <LabelledInput
          key="minutes"
          label={`${name}, ${COMMUNITY.periodMinutes}`}
          value={period.minutes}
          onText={change('minutes')}
        />
      ))}
      <button
        className="linkbtn"
        type="button"
        onClick={calling(set, { periods: form.periods.filter((_, at) => at !== index) })}
      >
        {`${COMMUNITY.removePeriod} ${String(index + 1)}`}
      </button>
    </div>
  );
}

/** The outdoor periods, with a button to add one, up to the most the schema accepts. */
export function Periods({ kit }: { readonly kit: Kit }): ReactElement {
  const { periods } = kit.form;
  return (
    <fieldset className="form-block">
      <legend>{COMMUNITY.periods}</legend>
      {periods.map((_, index) => (
        <PeriodRow key={index} kit={kit} index={index} />
      ))}
      <button
        className="btn btn-quiet"
        type="button"
        disabled={periods.length >= MAX_PERIODS}
        onClick={calling(kit.set, { periods: [...periods, { start: '', minutes: '' }] })}
      >
        {COMMUNITY.addPeriod}
      </button>
    </fieldset>
  );
}

/** The samples, each a button that fills the form with it. */
export function SampleList({ onPick }: { readonly onPick: (form: CommunityForm) => void }): ReactElement {
  return (
    <section className="sec" aria-label={COMMUNITY.samples}>
      <h2>{COMMUNITY.samples}</h2>
      <ul className="abstract">
        {COMMUNITY_SAMPLES.map((sample) => (
          <li key={sample.id}>
            <button className="linkbtn" type="button" onClick={calling(onPick, formFrom(sample.input))}>
              {sample.description}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
