// Tests for the sample list: picking a sample hands over the form filled from it.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { COMMUNITY_SAMPLES } from '../../../src/features/community/samples.js';
import { formFrom } from '../../../src/ui/community/community-form.js';
import { SampleList } from '../../../src/ui/community/FormPeriods.js';
import { communityAt } from '../plan/fixtures.js';

describe('SampleList', () => {
  it('lists both samples by their make-up and hands over the filled form', async () => {
    const onPick = vi.fn();
    render(<SampleList onPick={onPick} />);
    expect(screen.getAllByRole('button')).toHaveLength(COMMUNITY_SAMPLES.length);
    await userEvent.click(screen.getByRole('button', { name: /A primary school/ }));
    expect(onPick).toHaveBeenCalledWith(formFrom(communityAt(1)));
  });
});
