// Tests for the request hooks: loading, done, failed, retry, a newer input replacing an older one, and abort.
import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '../../../src/lib/result.js';
import type { Result } from '../../../src/lib/result.js';
import type { ApiCallFailure } from '../../../src/ui/api-client.js';
import { useAction, useQuery } from '../../../src/ui/data/request.js';
import type { Call, RequestState } from '../../../src/ui/data/request.js';

type Answer = Result<string, ApiCallFailure>;

/** A call whose answers the test hands out by input, recording every signal it was given. */
function controlledCall() {
  const waiting = new Map<string, (answer: Answer) => void>();
  const signals: AbortSignal[] = [];
  const call: Call<string, string> = (input, signal) => {
    signals.push(signal);
    return new Promise((resolve) => waiting.set(input, resolve));
  };
  const answer = async (input: string, value: Answer): Promise<void> => {
    await act(async () => {
      waiting.get(input)?.(value);
      await Promise.resolve();
    });
  };
  return { call, answer, signals };
}

const show = (state: RequestState<string>): string => {
  switch (state.status) {
    case 'done':
      return `done ${state.data}`;
    case 'failed':
      return `failed ${state.failure.kind}`;
    case 'idle':
    case 'loading':
      return state.status;
  }
};

describe('useQuery', () => {
  it('stays idle without input, loads, settles and retries', async () => {
    const { call, answer } = controlledCall();
    const onDone = vi.fn();
    function Air({ input }: { readonly input: string | null }): ReactElement {
      const { state, retry } = useQuery(call, input, onDone);
      return (
        <button type="button" onClick={retry}>
          {show(state)}
        </button>
      );
    }
    const { rerender } = render(<Air input={null} />);
    expect(screen.getByRole('button')).toHaveTextContent('idle');
    rerender(<Air input="delhi" />);
    expect(screen.getByRole('button')).toHaveTextContent('loading');
    await answer('delhi', err({ kind: 'network' }));
    expect(screen.getByRole('button')).toHaveTextContent('failed network');
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('loading');
    await answer('delhi', ok('AQI 342'));
    expect(screen.getByRole('button')).toHaveTextContent('done AQI 342');
    expect(onDone).toHaveBeenCalledWith('AQI 342');
  });

  it('aborts an older request when the input changes and never uses its answer', async () => {
    const { call, answer, signals } = controlledCall();
    const onDone = vi.fn();
    function Air({ input }: { readonly input: string }): ReactElement {
      return <p>{show(useQuery(call, input, onDone).state)}</p>;
    }
    const { rerender, unmount } = render(<Air input="delhi" />);
    rerender(<Air input="mumbai" />);
    rerender(<Air input="pune" />);
    expect(signals[0]?.aborted).toBe(true);
    await answer('delhi', ok('old'));
    expect(screen.getByText('loading')).toBeInTheDocument();
    await answer('pune', ok('new'));
    expect(screen.getByText('done new')).toBeInTheDocument();
    await answer('mumbai', ok('late'));
    expect(screen.getByText('done new')).toBeInTheDocument();
    expect(onDone.mock.calls).toEqual([['new']]);
    rerender(<Air input="pune" />);
    expect(screen.getByText('done new')).toBeInTheDocument();
    unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });
});

describe('useAction', () => {
  it('runs on demand, retries the same input, and resets', async () => {
    const { call, answer, signals } = controlledCall();
    function Send(): ReactElement {
      const [text, setText] = useState('first');
      const { state, run, retry, reset } = useAction(call);
      return (
        <>
          <p>{show(state)}</p>
          <button
            type="button"
            onClick={() => {
              run(text);
              setText('second');
            }}
          >
            Send
          </button>
          <button type="button" onClick={retry}>
            Again
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </>
      );
    }
    render(<Send />);
    await userEvent.click(screen.getByRole('button', { name: 'Again' }));
    expect(screen.getByText('idle')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByText('loading')).toBeInTheDocument();
    await answer('first', err({ kind: 'http', status: 500 }));
    expect(screen.getByText('failed http')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Again' }));
    expect(signals).toHaveLength(2);
    await answer('first', ok('plan'));
    expect(screen.getByText('done plan')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(signals[2]?.aborted).toBe(true);
    expect(screen.getByText('idle')).toBeInTheDocument();
  });
});
