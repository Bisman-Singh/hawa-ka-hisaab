// Tests for a plan item entry: an item with nothing below it has no lower row, and one with no start has no time.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { contextFor } from '../../../src/ui/plan/plan-data.js';
import { ItemEntry } from '../../../src/ui/plan/PlanEntry.js';
import { sample } from '../../support/plan-fixtures.js';
import { need, planResponse } from './fixtures.js';

describe('ItemEntry', () => {
  it('leaves out the lower row when there is no trade-off, toggle or working, and shows no time without a start', () => {
    const { plan } = planResponse('students-cycle', 'good');
    const household = sample('students-cycle');
    const item = { ...need(plan.slots.morning[0]), start: null };
    const { container } = render(
      <ol>
        <ItemEntry
          item={item}
          household={household}
          ctx={contextFor(plan, household, { curve: null, notBefore: null })}
          language="en"
        />
      </ol>,
    );
    expect(container.querySelector('.more')).toBeNull();
    expect(container.querySelector('.when .t')).toBeEmptyDOMElement();
    expect(screen.getByText('None needed.')).toBeInTheDocument();
  });
});
