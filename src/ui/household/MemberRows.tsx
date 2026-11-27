// The people block of the household form: an age group and flags for each person. There is no name field.
import { fill } from '../../lib/template.js';
import type { ReactElement } from 'react';
import { describeMember } from '../../features/household/members.js';
import type { Member } from '../../features/household/types.js';
import { Checks } from './checks.js';
import { Choice } from './controls.js';
import { binder, MAX_ROWS, NEW_ROW, replaceAt, withoutMember } from './edits.js';
import { OPTIONS } from './options.js';
import { AddButton, RowTitle, UndoLine } from './rows.js';
import { FORM } from './words.js';
import type { HouseholdFormState } from './useHouseholdForm.js';

function MemberRow({ form, member, index }: { form: HouseholdFormState; member: Member; index: number }) {
  const { draft, at } = form;
  const title = at('members', index).id;
  const bind = binder(member, (next) => {
    form.edit({ ...draft, members: replaceAt(draft.members, index, next) });
  });
  const remove = (): void => {
    const back = at('members', index, 'ageGroup').id;
    const said = fill(FORM.removed, { what: fill(FORM.person, { n: index + 1 }) });
    form.remove({ block: 'members', said, next: withoutMember(draft, member.id), back });
  };
  return (
    <div className="row-form" role="group" aria-labelledby={title}>
      <RowTitle
        id={title}
        title={`${fill(FORM.person, { n: index + 1 })}, ${describeMember(member)}`}
        onRemove={remove}
      />
      <Choice
        {...at('members', index, 'ageGroup')}
        label={FORM.age}
        options={OPTIONS.age}
        {...bind('ageGroup')}
      />
      <Checks
        {...at('members', index, 'flags')}
        legend={FORM.flags}
        options={OPTIONS.flag}
        {...bind('flags')}
      />
    </div>
  );
}

/** The people block, with Add a person and the undo line after a removal. */
export function MemberRows({ form }: { readonly form: HouseholdFormState }): ReactElement {
  const { draft, at } = form;
  const block = at('members');
  const add = (): void => {
    const next = { ...draft, members: [...draft.members, NEW_ROW.member(draft)] };
    form.add(next, at('members', draft.members.length, 'ageGroup').id);
  };
  return (
    <fieldset className="form-block">
      <legend>{FORM.people}</legend>
      <p className="hint">{FORM.peopleHint}</p>
      {draft.members.map((member, index) => (
        <MemberRow key={member.id} form={form} member={member} index={index} />
      ))}
      <UndoLine form={form} block="members" />
      {block.error === undefined ? null : (
        <p className="hint" id={`${block.id}-error`}>
          <b>{block.error}</b>
        </p>
      )}
      <AddButton
        label={FORM.addPerson}
        full={draft.members.length >= MAX_ROWS.members}
        onAdd={add}
        id={block.id}
        describedBy={block.error === undefined ? undefined : `${block.id}-error`}
      />
    </fieldset>
  );
}
