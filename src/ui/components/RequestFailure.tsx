// The error state of a request, with words for what failed and a retry. Every view shows failures this way.
import { Button } from './Button.js';
import type { ReactElement } from 'react';
import type { ApiCallFailure } from '../api-client.js';
import { failureText, UI } from './words.js';
import { StateMessage } from './StateMessage.js';

/** Props of a failure message. retry repeats the request that failed. */
export interface RequestFailureProps {
  readonly failure: ApiCallFailure;
  readonly retry: () => void;
  readonly level?: 2 | 3 | 4;
}

/** An alert naming the failure in plain words, with a Try again button. */
export function RequestFailure({ failure, retry, level = 3 }: RequestFailureProps): ReactElement {
  const text = failureText(failure);
  return (
    <StateMessage
      tone="alert"
      glyph={failure.kind === 'network' ? 'offline' : 'feed'}
      title={text.title}
      level={level}
    >
      <p>{text.body}</p>
      <Button onClick={retry}>{UI.retry}</Button>
    </StateMessage>
  );
}
