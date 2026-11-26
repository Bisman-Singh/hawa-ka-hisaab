// A segmented choice on native radios inside a fieldset: arrow keys move the choice, as browsers do for radios.
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { Language } from '../../lib/types.js';

/** One option. lang marks an option written in another language, such as the Hindi language choice. */
export interface SegmentOption<V extends string> {
  readonly value: V;
  readonly label: ReactNode;
  readonly lang?: Language;
}

/** Props of a segmented choice. The selected segment is ink-filled and bold. */
export interface SegmentedProps<V extends string> {
  readonly legend: ReactNode;
  readonly options: readonly SegmentOption<V>[];
  readonly value: V;
  readonly onChange: (value: V) => void;
  readonly name?: string;
}

/** Used for what-if toggles, the plan language and short form choices. */
export function Segmented<V extends string>(props: SegmentedProps<V>): ReactElement {
  const { legend, options, value, onChange, name } = props;
  const own = useId();
  return (
    <fieldset className="seg">
      <legend>{legend}</legend>
      <div className="seg-opts">
        {options.map((option) => (
          <label key={option.value} lang={option.lang}>
            <input
              type="radio"
              name={name ?? own}
              value={option.value}
              checked={option.value === value}
              onChange={() => {
                onChange(option.value);
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
