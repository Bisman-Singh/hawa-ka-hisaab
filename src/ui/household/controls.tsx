// Labelled controls for the household form: a select over named options and a text input. Each takes the id and
// problem of its field, and a value with its change, as binder gives them.
import type { ReactElement } from 'react';
import { Field } from '../components/Field.js';

/** The keys of an options record, typed as its values. */
export const keysOf = <V extends string>(options: Readonly<Record<V, string>>): V[] =>
  Object.keys(options).filter((key): key is V => key in options);

/** What every control takes: the field id and its problem, if any. */
export interface FieldProps {
  readonly id: string;
  readonly error: string | undefined;
}

/** Props of a select. options maps each value to its words. */
export interface ChoiceProps<V extends string> extends FieldProps {
  readonly label: string;
  readonly value: V;
  readonly options: Readonly<Record<V, string>>;
  readonly onChange: (value: V) => void;
}

/** A labelled native select. */
export function Choice<V extends string>({
  id,
  error,
  label,
  value,
  options,
  onChange,
}: ChoiceProps<V>): ReactElement {
  const keys = keysOf(options);
  return (
    <Field id={id} label={label} error={error}>
      {(control) => (
        <select
          {...control}
          value={value}
          onChange={(event) => {
            keys
              .filter((key) => key === event.target.value)
              .forEach((key) => {
                onChange(key);
              });
          }}
        >
          {keys.map((key) => (
            <option key={key} value={key}>
              {options[key]}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Props of a text input. type time gives the browser's time picker; inputMode picks the phone keyboard. */
export interface TextProps extends FieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly hint?: string;
  readonly type?: 'text' | 'time';
  readonly inputMode?: 'text' | 'numeric' | 'decimal';
}

/** A labelled text input. */
export function TextInput({
  id,
  error,
  label,
  value,
  onChange,
  hint,
  type = 'text',
  inputMode,
}: TextProps): ReactElement {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      {(control) => (
        <input
          {...control}
          className="input"
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      )}
    </Field>
  );
}
