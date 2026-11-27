// Tests for the failure table: the words the screen chooses from and the wait before asking again.
import { describe, expect, it } from 'vitest';
import type { FeedFailure } from '../../../src/features/air/types.js';
import { feedProblem, retryAfterMs, SHORT_RETRY_MS } from '../../../src/features/air/failures.js';

describe('the failure table', () => {
  it('names why the station data could not be read, in the kinds the screen words', () => {
    const cases: [FeedFailure, string][] = [
      [{ kind: 'incomplete' }, 'updating'],
      [{ kind: 'status', status: 429 }, 'busy'],
      [{ kind: 'over_budget' }, 'busy'],
      [{ kind: 'timeout' }, 'no_answer'],
      [{ kind: 'network' }, 'no_answer'],
      [{ kind: 'status', status: 503 }, 'no_answer'],
      [{ kind: 'status', status: 403 }, 'unusable'],
      [{ kind: 'invalid_body' }, 'unusable'],
      [{ kind: 'too_large' }, 'unusable'],
    ];
    expect(cases.map(([failure]) => feedProblem(failure))).toEqual(cases.map(([, problem]) => problem));
  });

  it('waits briefly for a rebuild, longer when told to slow down, long when refused, never for an unmade call', () => {
    const failures: [FeedFailure, number][] = [
      [{ kind: 'incomplete' }, 20_000],
      [{ kind: 'network' }, 20_000],
      [{ kind: 'status', status: 503 }, 20_000],
      [{ kind: 'status', status: 429 }, 60_000],
      [{ kind: 'timeout' }, 60_000],
      [{ kind: 'invalid_body' }, 60_000],
      [{ kind: 'status', status: 403 }, 600_000],
      [{ kind: 'status', status: 302 }, 600_000],
      [{ kind: 'too_large' }, 600_000],
      [{ kind: 'over_budget' }, 0],
    ];
    expect(failures.map(([failure]) => retryAfterMs(failure))).toEqual(failures.map(([, ms]) => ms));
    expect(SHORT_RETRY_MS).toBe(20_000);
  });
});
