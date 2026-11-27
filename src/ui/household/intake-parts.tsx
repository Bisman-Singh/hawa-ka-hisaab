// The parts of the intake: the text box with its count and problem, and the samples to start from, which the
// household view offers too.
import { Button } from '../components/Button.js';
import { type ReactElement, useId } from 'react';
import { SAMPLE_HOUSEHOLDS, type SampleHousehold } from '../../features/household/samples.js';
import { calling } from '../handlers.js';
import { charsText, INTAKE } from './words.js';

/** Props of the intake text box. problem is why the last send was refused, if it was. */
export interface IntakeTextProps {
  readonly id: string;
  readonly text: string;
  readonly problem: string | null;
  readonly onText: (text: string) => void;
}

/** The text box with its heading label, hint, problem and character count. */
export function IntakeText({ id, text, problem, onText }: IntakeTextProps): ReactElement {
  const described = [problem === null ? '' : `${id}-error`, `${id}-hint`, `${id}-count`, `${id}-privacy`];
  return (
    <div className="field">
      <h2 id={`${id}-h`}>
        <label htmlFor={`${id}-text`}>{INTAKE.ask}</label>
      </h2>
      <p className="hint" id={`${id}-hint`}>
        {INTAKE.hint}
      </p>
      <textarea
        id={`${id}-text`}
        rows={6}
        value={text}
        aria-describedby={described.join(' ').trim()}
        aria-invalid={problem === null ? undefined : true}
        onChange={(event) => {
          onText(event.target.value);
        }}
      />
      {problem === null ? null : (
        <p className="hint" id={`${id}-error`}>
          <b>{problem}</b>
        </p>
      )}
      <p className="hint" id={`${id}-count`}>
        {charsText(text.length)}
      </p>
    </div>
  );
}

/** Props of a sample list: its title and heading level, the button words, how many to offer and what a pick does. */
export interface SampleListProps {
  readonly title: string;
  readonly heading: 'h2' | 'h3';
  readonly use: string;
  readonly onUse: (sample: SampleHousehold) => void;
  readonly count?: number;
}

/** The made-up sample households, each with a button that takes it. */
export function SampleList({ title, heading: Heading, use, onUse, count }: SampleListProps): ReactElement {
  const id = useId();
  return (
    <>
      <Heading className="label" id={id}>
        {title}
      </Heading>
      <ul className="samples" aria-labelledby={id}>
        {SAMPLE_HOUSEHOLDS.slice(0, count).map((sample) => (
          <li key={sample.id}>
            <q id={`${id}-${sample.id}`}>{sample.description}</q>
            <Button describedBy={`${id}-${sample.id}`} onClick={calling(onUse, sample)}>
              {use}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
