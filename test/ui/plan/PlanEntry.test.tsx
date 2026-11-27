// Tests for a plan item entry: an item with nothing below it has no lower row, and one with no start has no time.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { contextFor } from '../../../src/ui/plan/plan-data.js';
import { ItemEntry } from '../../../src/ui/plan/PlanEntry.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { planItems } from '../../../src/features/planner/assemble.js';
import { userEvent } from '@testing-library/user-event';
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

  it('says why a breathing range is wide once: a bus swap whose trade-off explains it shows no second note', () => {
    const { plan } = planResponse('family-car-asthma', 'poor');
    const household = sample('family-car-asthma');
    const items = [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening];
    const bus = need(items.find((item) => item.candidateId === 'swap-a1'));
    const { container } = render(
      <ol>
        <ItemEntry
          item={bus}
          household={household}
          ctx={contextFor(plan, household, { curve: null, notBefore: null })}
          language="en"
        />
      </ol>,
    );
    expect(container.querySelector('.tradeoff')).toHaveTextContent('than in a closed car with AC');
    expect(container).not.toHaveTextContent('Wide because a closed car with AC keeps out far more');
  });

  it('announces a what-if choice on a Hindi plan as Hindi', async () => {
    const { plan } = planResponse('family-car-asthma', 'poor', { language: 'hi' });
    const household = sample('family-car-asthma');
    const bus = need(planItems(plan).find((item) => item.whatIfs.length > 0));
    render(
      <Announcer>
        <ol>
          <ItemEntry
            item={bus}
            household={household}
            ctx={contextFor(plan, household, { curve: null, notBefore: null })}
            language="hi"
          />
        </ol>
      </Announcer>,
    );
    await userEvent.click(screen.getByRole('radio', { name: need(bus.whatIfs[0]).label }));
    const said = document.querySelector('.vh[role="status"] p');
    expect(said).toHaveAttribute('lang', 'hi');
    expect(said?.textContent).toContain('। ');
    expect(said?.textContent).not.toContain('. ');
  });
});
