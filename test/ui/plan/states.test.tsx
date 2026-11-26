// Tests for the waiting state: only the steps that have started are listed.
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlanLoading } from '../../../src/ui/plan/states.js';
import { renderInApp } from '../helpers.js';

describe('PlanLoading', () => {
  it('lists the air step as under way until the air is in', () => {
    renderInApp(<PlanLoading airDone={false} title="Today's plan" />);
    expect(screen.getAllByRole('listitem').filter((item) => item.closest('.steps'))).toHaveLength(1);
    expect(screen.getByText('Now')).toBeInTheDocument();
  });
});
