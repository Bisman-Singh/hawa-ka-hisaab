// The form a housing society or school fills in, with the two samples to start from. It is checked with the
// community schema before it is sent, and a refused field keeps the text typed and takes the focus.
import { useId, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import type { CommunityInput } from '../../features/community/types.js';
import { focusOn } from '../ask/AskBox.js';
import { Segmented } from '../components/Segmented.js';
import { EMPTY_FORM, readForm } from './community-form.js';
import type { CommunityForm, FormKey } from './community-form.js';
import { Counts, Sources, TextField } from './FormParts.js';
import { Periods, SampleList } from './FormPeriods.js';
import type { Kit } from './FormParts.js';
import { COMMUNITY } from './strings.js';

const MESSAGE: Readonly<Partial<Record<FormKey, string>>> = {
  count: COMMUNITY.countError,
  periods: COMMUNITY.periodError,
  assembly: COMMUNITY.timeError,
};

const KINDS: { value: CommunityInput['kind']; label: string }[] = [
  { value: 'housing_society', label: COMMUNITY.society },
  { value: 'school', label: COMMUNITY.school },
];

/** Props of the form: what to do with a checked input, and whether a request is running. */
export interface CommunityFormProps {
  readonly onSend: (input: CommunityInput) => void;
  readonly busy: boolean;
}

function useFormKit(): {
  readonly kit: Kit;
  readonly load: (form: CommunityForm) => void;
  readonly refuse: (keys: readonly FormKey[]) => void;
} {
  const own = useId();
  const [form, setForm] = useState<CommunityForm>(EMPTY_FORM);
  const [problems, setProblems] = useState<readonly FormKey[]>([]);
  const kit: Kit = {
    form,
    set: (patch) => {
      setForm((current) => ({ ...current, ...patch }));
    },
    text: (key) => (value) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    idOf: (key) => `${own}-${key}`,
    errorOf: (key) => (problems.includes(key) ? { error: MESSAGE[key] ?? COMMUNITY.numberError } : {}),
  };
  const load = (next: CommunityForm): void => {
    setForm(next);
    setProblems([]);
  };
  return { kit, load, refuse: setProblems };
}

/** The whole form. onSend receives a checked input; busy disables the send button while a request runs. */
export function CommunityFormView({ onSend, busy }: CommunityFormProps): ReactElement {
  const { kit, load, refuse } = useFormKit();
  const send = (event: SubmitEvent): void => {
    event.preventDefault();
    const read = readForm(kit.form);
    refuse('input' in read ? [] : read.problems);
    if ('input' in read) {
      onSend(read.input);
      return;
    }
    read.problems.slice(0, 1).forEach((key) => {
      focusOn(document.getElementById(kit.idOf(key)));
    });
  };
  return (
    <>
      <SampleList onPick={load} />
      <form onSubmit={send} noValidate>
        <Segmented
          legend={COMMUNITY.kind}
          options={KINDS}
          value={kit.form.kind}
          onChange={(kind) => {
            kit.set({ kind });
          }}
        />
        <Counts kit={kit} />
        <Sources kit={kit} />
        {kit.form.kind === 'school' ? (
          <TextField kit={kit} name="assembly" label={COMMUNITY.assembly} kind="time" />
        ) : null}
        <Periods kit={kit} />
        <button className="btn" type="submit" disabled={busy}>
          {COMMUNITY.send}
        </button>
      </form>
    </>
  );
}
