// What the model made of the typed text: the outcome, or why it could not read it, the text as typed, the parts it
// could not place and what it assumed. The form beside it is what the plan uses.
import { type ReactElement, useId } from 'react';
import { StateMessage } from '../components/StateMessage.js';
import type { IntakeEntry } from './intake-store.js';
import { HOUSEHOLD, MODEL_DOWN } from './words.js';

function Notes({ title, note, items }: { title: string; note: string; items: readonly string[] }) {
  const id = useId();
  return items.length === 0 ? null : (
    <section className="unplaced" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <p className="small">{note}</p>
      <ul>
        {items.map((item, index) => (
          <li key={`${String(index)}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

/** The text as typed beside what the model read: the outcome, the text, what it could not place and assumed. */
export function AsRead({ entry }: { readonly entry: IntakeEntry }): ReactElement {
  const id = useId();
  const { response } = entry;
  return (
    <>
      {response.outcome === 'parsed' ? (
        <p className="lede">{HOUSEHOLD.readLede}</p>
      ) : (
        <StateMessage tone="status" glyph="model" title={HOUSEHOLD.downTitle} quiet>
          <p>
            {MODEL_DOWN[response.reason]} {HOUSEHOLD.downNext}
          </p>
        </StateMessage>
      )}
      <section className="sec" aria-labelledby={id}>
        <h2 id={id}>{HOUSEHOLD.wrote}</h2>
        <blockquote className="typed">
          <p>{entry.text}</p>
        </blockquote>
      </section>
      {response.outcome === 'parsed' ? (
        <>
          <Notes title={HOUSEHOLD.unplaced} note={HOUSEHOLD.unplacedNote} items={response.unplaced} />
          <Notes title={HOUSEHOLD.assumed} note={HOUSEHOLD.assumedNote} items={response.assumed} />
        </>
      ) : null}
      <p className="small">{HOUSEHOLD.usesForm}</p>
    </>
  );
}
