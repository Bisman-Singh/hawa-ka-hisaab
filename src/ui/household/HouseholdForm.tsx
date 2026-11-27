// The household form: people, outings and home, then Save. A saved household offers today's plan; a form with
// problems says how many and moves focus to the first.
import { calling } from '../handlers.js';
import { Button } from '../components/Button.js';
import type { ReactElement } from 'react';
import { ViewLink } from '../components/Navigation.js';
import { StateMessage } from '../components/StateMessage.js';
import { HOME, useRoute } from '../router.js';
import { ActivityRows } from './ActivityRows.js';
import { HomeRows } from './HomeRows.js';
import { MemberRows } from './MemberRows.js';
import { FORM, fixText, HOUSEHOLD } from './words.js';
import type { HouseholdFormState } from './useHouseholdForm.js';

function SaveState({ form, kept }: { readonly form: HouseholdFormState; readonly kept: boolean }) {
  const { navigate } = useRoute();
  if (!form.saved) {
    return form.problems === 0 ? null : (
      <p className="hint">
        <b>{fixText(form.problems)}</b>
      </p>
    );
  }
  return (
    <StateMessage tone="status" glyph="start" title={kept ? FORM.saved : FORM.notKept}>
      {kept ? null : <p>{FORM.notKeptBody}</p>}
      <Button look="main" id={form.ids.plan} onClick={calling(navigate, 'plan')}>
        {FORM.plan}
      </Button>
    </StateMessage>
  );
}

/** Props of the form. fromText says the form was read from typed text, which changes the way back. */
export interface HouseholdFormProps {
  readonly form: HouseholdFormState;
  readonly kept: boolean;
  readonly fromText: boolean;
}

/** The whole form. It works the same with or without the model. */
export function HouseholdForm({ form, kept, fromText }: HouseholdFormProps): ReactElement {
  return (
    <form onSubmit={form.submit} noValidate aria-label={HOUSEHOLD.title}>
      <MemberRows form={form} />
      <ActivityRows form={form} />
      <HomeRows form={form} />
      <div className="actions">
        <button className="btn" type="submit">
          {FORM.save}
        </button>
        <ViewLink to={HOME}>{fromText ? HOUSEHOLD.change : HOUSEHOLD.back}</ViewLink>
      </div>
      <SaveState form={form} kept={kept} />
    </form>
  );
}
