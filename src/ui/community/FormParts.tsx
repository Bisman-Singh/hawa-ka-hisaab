// Parts of the community form: a text field tied to the form state, the sources of smoke, the outdoor periods
// and the samples to start from. Every field keeps what was typed until the form is sent.
import type { ReactElement } from 'react';
import { Field } from '../components/Field.js';
import { Segmented } from '../components/Segmented.js';
import type { CommunityForm, FormKey, GeneratorChoice } from './community-form.js';
import { COMMUNITY } from './words.js';
import { texting } from '../handlers.js';

/** A field the form holds as text. */
export type TextKey = Exclude<FormKey, 'periods'>;

/** What every part of the form needs: the form, ways to change it, and the id and error of a field. */
export interface Kit {
  readonly form: CommunityForm;
  readonly set: (patch: Partial<CommunityForm>) => void;
  readonly text: (key: TextKey) => (value: string) => void;
  readonly idOf: (key: FormKey) => string;
  readonly errorOf: (key: FormKey) => { error?: string };
}

/** Props of a labelled input: its label, text, change handler, keyboard, and id and error when given. */
export interface InputProps {
  readonly label: string;
  readonly value: string;
  readonly onText: (value: string) => void;
  readonly kind?: 'numeric' | 'decimal' | 'time';
  readonly id?: string;
  readonly error?: string;
}

/** A labelled input that asks for the right keyboard: numbers, decimals or a time. */
export function LabelledInput({
  label,
  value,
  onText,
  kind = 'numeric',
  ...field
}: InputProps): ReactElement {
  return (
    <Field label={label} {...field}>
      {(control) => (
        <input
          {...control}
          className="input"
          {...(kind === 'time' ? { type: 'time' } : { inputMode: kind })}
          value={value}
          onChange={texting(onText)}
        />
      )}
    </Field>
  );
}

/** An input for one text field of the form, with its error when the form was refused. */
export function TextField({
  kit,
  name,
  ...rest
}: { readonly kit: Kit; readonly name: TextKey } & Omit<InputProps, 'value' | 'onText'>): ReactElement {
  return (
    <LabelledInput
      {...rest}
      id={kit.idOf(name)}
      {...kit.errorOf(name)}
      value={kit.form[name]}
      onText={kit.text(name)}
    />
  );
}

/** The counts: homes or pupils, outdoor staff, and for a society its children and older adults. */
export function Counts({ kit }: { readonly kit: Kit }): ReactElement {
  const school = kit.form.kind === 'school';
  return (
    <>
      <div className="grid-2">
        <TextField kit={kit} name="count" label={school ? COMMUNITY.pupils : COMMUNITY.homes} />
        <TextField kit={kit} name="outdoorStaff" label={COMMUNITY.outdoorStaff} />
      </div>
      {school ? null : (
        <div className="grid-2">
          <TextField kit={kit} name="children" label={COMMUNITY.children} />
          <TextField kit={kit} name="olderAdults" label={COMMUNITY.olderAdults} />
        </div>
      )}
    </>
  );
}

const option = <V extends string>(value: V, label: string): { value: V; label: string } => ({ value, label });

/** The sources of smoke: a generator, waste burning and engines running at the gate. */
export function Sources({ kit }: { readonly kit: Kit }): ReactElement {
  const { form, set } = kit;
  const fuels = (['none', 'diesel', 'gas', 'unknown'] satisfies GeneratorChoice[]).map((fuel) =>
    option(fuel, COMMUNITY.generatorFuel[fuel]),
  );
  const burning = (['never', 'sometimes', 'often'] satisfies CommunityForm['wasteBurning'][]).map((when) =>
    option(when, COMMUNITY.burningWhen[when]),
  );
  return (
    <>
      <Segmented
        legend={COMMUNITY.generator}
        options={fuels}
        value={form.generator}
        onChange={(generator) => {
          set({ generator });
        }}
      />
      {form.generator === 'none' ? null : (
        <div className="grid-2">
          <TextField kit={kit} name="hours" label={COMMUNITY.hours} kind="decimal" />
          <TextField kit={kit} name="kva" label={COMMUNITY.kva} kind="decimal" />
        </div>
      )}
      <Segmented
        legend={COMMUNITY.burning}
        options={burning}
        value={form.wasteBurning}
        onChange={(wasteBurning) => {
          set({ wasteBurning });
        }}
      />
      <div className="grid-2">
        <TextField kit={kit} name="vehicles" label={COMMUNITY.vehicles} />
        <TextField kit={kit} name="idleMinutes" label={COMMUNITY.idleMinutes} kind="decimal" />
      </div>
    </>
  );
}
