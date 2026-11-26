// Checkboxes for the household form: one checkbox drawn as a flag, and a group of them with its problem.
import type { ReactElement } from 'react';
import { keysOf } from './controls.js';
import type { FieldProps } from './controls.js';

/** Props of one checkbox. */
export interface CheckProps {
  readonly id: string;
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (checked: boolean) => void;
}

/** One checkbox drawn as a flag. */
export function Check({ id, label, value, onChange }: CheckProps): ReactElement {
  return (
    <label className="flag" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={value}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      {label}
    </label>
  );
}

/** Props of a checkbox group. The first box takes the field id, so a problem can move focus to it. */
export interface ChecksProps<V extends string> extends FieldProps {
  readonly legend: string;
  readonly options: Readonly<Record<V, string>>;
  readonly value: readonly V[];
  readonly onChange: (value: V[]) => void;
}

/** A group of checkboxes drawn as flags, with its problem tied to the group. */
export function Checks<V extends string>({
  id,
  error,
  legend,
  options,
  value,
  onChange,
}: ChecksProps<V>): ReactElement {
  const toggle = (key: V) => (checked: boolean) => {
    onChange(checked ? [...value, key] : value.filter((item) => item !== key));
  };
  return (
    <fieldset className="flags" aria-describedby={error === undefined ? undefined : `${id}-error`}>
      <legend>{legend}</legend>
      <div className="flag-list">
        {keysOf(options).map((key, index) => (
          <Check
            key={key}
            id={index === 0 ? id : `${id}-${key}`}
            label={options[key]}
            value={value.includes(key)}
            onChange={toggle(key)}
          />
        ))}
      </div>
      {error === undefined ? null : (
        <p className="hint" id={`${id}-error`}>
          <b>{error}</b>
        </p>
      )}
    </fieldset>
  );
}
