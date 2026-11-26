// Tests for the plan head: the place and band in the for-line, the stamp, and the language switch.
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlanHead } from '../../../src/ui/plan/PlanHead.js';
import { sample } from '../../support/plan-fixtures.js';
import { fakeDialog, renderInApp } from '../helpers.js';
import { airResponse, planResponse, saveSample } from './fixtures.js';

beforeEach(() => {
  window.localStorage.clear();
  fakeDialog();
});

describe('PlanHead', () => {
  it('says who and where the plan is for, on what band, without a place when none was searched', () => {
    saveSample();
    renderInApp(
      <PlanHead
        response={planResponse('family-car-asthma', 'poor')}
        air={airResponse('poor')}
        household={sample('family-car-asthma')}
      />,
    );
    expect(screen.getByText(/For a household of 4 in Delhi, on a/)).toBeInTheDocument();
    expect(screen.getByText('Poor')).toBeInTheDocument();
    window.localStorage.clear();
  });

  it('leaves the place out when the location came from the device', () => {
    renderInApp(
      <PlanHead
        response={planResponse('delivery-rider', 'poor')}
        air={null}
        household={sample('delivery-rider')}
      />,
    );
    expect(screen.getByText(/For a household of 1, on a/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
  });
});
