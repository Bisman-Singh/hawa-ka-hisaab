// Tests for the plan screens' air request: the held reading without a request, a fresh read kept in the shared
// state, and retry dropping the held reading to read again.
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useAirQuery } from '../../../src/ui/plan/useAirQuery.js';
import { AppStateProvider } from '../../../src/ui/state/app-state.js';
import { airResponse, DELHI, json, stubApi } from './fixtures.js';

const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <AppStateProvider storage={null}>{children}</AppStateProvider>
);

describe('useAirQuery', () => {
  it('reads the air once, holds it, and reads again on retry', async () => {
    const fetcher = stubApi({ '/api/air': () => json(airResponse('poor')) });
    const { result } = renderHook(() => useAirQuery(DELHI), { wrapper });
    await waitFor(() => {
      expect(result.current.reading).not.toBeNull();
    });
    expect(result.current.air.state).toEqual({ status: 'done', data: airResponse('poor') });
    expect(fetcher).toHaveBeenCalledTimes(1);
    act(() => {
      result.current.air.retry();
    });
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });
});
