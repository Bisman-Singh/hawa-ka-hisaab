// The parts of the intake box: the text box with its count and problem, and the samples to start from.
import type { ReactElement } from 'react';
import { SAMPLE_HOUSEHOLDS } from '../../features/household/samples.js';
import { INTAKE, PRIVACY_NOTE } from './strings.js';

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
        {INTAKE.count(text.length)}
      </p>
    </div>
  );
}

/** Three made-up samples, each with a button that copies it into the box. */
export function IntakeSamples({
  id,
  onUse,
}: {
  readonly id: string;
  readonly onUse: (text: string) => void;
}): ReactElement {
  return (
    <>
      <h3 className="label" id={`${id}-samples`}>
        {INTAKE.samples}
      </h3>
      <ul className="samples" aria-labelledby={`${id}-samples`}>
        {SAMPLE_HOUSEHOLDS.slice(0, 3).map((sample) => (
          <li key={sample.id}>
            <q id={`${id}-${sample.id}`}>{sample.description}</q>
            <button
              className="btn btn-quiet"
              type="button"
              aria-describedby={`${id}-${sample.id}`}
              onClick={() => {
                onUse(sample.description);
              }}
            >
              {INTAKE.use}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The note shown before the first send: where the text goes and what is kept. */
export function PrivacyNote({ id }: { readonly id: string }): ReactElement {
  return (
    <div className="privacy-note" id={id}>
      <p>
        <b>{PRIVACY_NOTE.lead}</b> {PRIVACY_NOTE.body}
      </p>
      <p>{PRIVACY_NOTE.kept}</p>
    </div>
  );
}
