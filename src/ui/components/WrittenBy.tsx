// The written-by stamp on generated text: solid when the model wrote it, dashed for fixed rules or a fixed reply.
import type { ReactElement } from 'react';
import type { Trace } from '../../lib/types.js';
import { UI } from './words.js';

/** Says who wrote the words, from the trace of the answer. Numbers are always worked out in code. */
export function WrittenBy({ producedBy }: { readonly producedBy: Trace['producedBy'] }): ReactElement {
  return <span className={producedBy === 'model' ? 'stamp' : 'stamp rules'}>{UI.stamp[producedBy]}</span>;
}
