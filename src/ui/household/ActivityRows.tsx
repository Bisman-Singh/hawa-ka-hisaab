// The outings block of the household form: who goes, what, a short description that is never a name, and the
// when and how of each outing.
import { fill } from '../../lib/template.js';
import type { ReactElement } from 'react';
import { describeMember } from '../../features/household/members.js';
import { Checks } from './checks.js';
import { Choice, TextInput } from './controls.js';
import type { DraftActivity } from './draft.js';
import { binder, MAX_ROWS, NEW_ROW, replaceAt } from './edits.js';
import { OPTIONS } from './options.js';
import { AddButton, RowTitle, UndoLine } from './rows.js';
import { FORM } from './words.js';
import { type OutingPath, TripFields } from './TripFields.js';
import type { HouseholdFormState } from './useHouseholdForm.js';

function ActivityRow(props: { form: HouseholdFormState; activity: DraftActivity; index: number }) {
  const { form, activity, index } = props;
  const { draft, at } = form;
  const path: OutingPath = (...rest) => at('activities', index, ...rest);
  const set = (next: DraftActivity): void => {
    form.edit({ ...draft, activities: replaceAt(draft.activities, index, next) });
  };
  const bind = binder(activity, set);
  const who = Object.fromEntries(
    draft.members.map((member, n) => [
      member.id,
      `${fill(FORM.person, { n: n + 1 })}, ${describeMember(member)}`,
    ]),
  );
  const remove = (): void => {
    const next = { ...draft, activities: draft.activities.filter((_, at) => at !== index) };
    form.remove({
      block: 'activities',
      said: fill(FORM.removed, { what: fill(FORM.outing, { n: index + 1 }) }),
      next,
      back: path('kind').id,
    });
  };
  const title = `${fill(FORM.outing, { n: index + 1 })}, ${activity.label ?? OPTIONS.kind[activity.kind]}`;
  return (
    <div className="row-form" role="group" aria-labelledby={path().id}>
      <RowTitle id={path().id} title={title} onRemove={remove} />
      <Checks {...path('memberIds')} legend={FORM.who} options={who} {...bind('memberIds')} />
      <div className="grid-2">
        <Choice {...path('kind')} label={FORM.what} options={OPTIONS.kind} {...bind('kind')} />
        <Choice {...path('setting')} label={FORM.setting} options={OPTIONS.setting} {...bind('setting')} />
      </div>
      <TextInput
        {...path('label')}
        label={FORM.label}
        hint={FORM.labelHint}
        value={activity.label ?? ''}
        onChange={(label) => {
          set({ ...activity, label: label === '' ? null : label });
        }}
      />
      <TripFields activity={activity} path={path} set={set} />
    </div>
  );
}

/** The outings block, with Add an outing and the undo line after a removal. */
export function ActivityRows({ form }: { readonly form: HouseholdFormState }): ReactElement {
  const { draft, at } = form;
  const add = (): void => {
    const next = { ...draft, activities: [...draft.activities, NEW_ROW.activity(draft)] };
    form.add(next, at('activities', draft.activities.length, 'memberIds').id);
  };
  return (
    <fieldset className="form-block">
      <legend>{FORM.outings}</legend>
      <p className="hint">{FORM.outingsHint}</p>
      {draft.activities.map((activity, index) => (
        <ActivityRow key={activity.id} form={form} activity={activity} index={index} />
      ))}
      <UndoLine form={form} block="activities" />
      <AddButton label={FORM.addOuting} full={draft.activities.length >= MAX_ROWS.activities} onAdd={add} />
    </fieldset>
  );
}
