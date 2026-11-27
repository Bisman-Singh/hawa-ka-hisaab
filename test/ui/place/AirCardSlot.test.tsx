// Tests for the air card slot: the waiting card stands in while the card's code loads, then the card shows.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AirResponse } from '../../../src/features/air/types.js';
import type { Query } from '../../../src/ui/data/request.js';
import { AirCardSlot } from '../../../src/ui/place/AirCardSlot.js';
import { airResponse } from './air-fixtures.js';

describe('AirCardSlot', () => {
  it('shows the waiting card first and the loaded card once its code arrives', async () => {
    const air: Query<AirResponse> = { state: { status: 'done', data: airResponse() }, retry: vi.fn() };
    render(<AirCardSlot air={air} where="Lucknow" />);
    expect(screen.getByText('Reading the air for Lucknow')).toBeInTheDocument();
    expect(await screen.findByText('JNU, Delhi - DPCC')).toBeInTheDocument();
    expect(screen.queryByText('Reading the air for Lucknow')).toBeNull();
  });
});
