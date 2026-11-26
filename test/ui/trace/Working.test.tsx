// Tests for the working sheet: inputs shown as the ledger displays them, the formula, and each factor linked to its
// source, with extra facts found and an unknown id named rather than hidden.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findFact } from '../../../src/config/facts/index.js';
import { COMMUNITY_FACTS } from '../../../src/config/facts/community.js';
import { displayValue } from '../../../src/features/ledger/format.js';
import { factsFor, Workings, WorkingSheet } from '../../../src/ui/trace/Working.js';
import { need, planResponse } from '../plan/fixtures.js';

const effect = () =>
  need(planResponse('family-car-asthma', 'poor').plan.slots.morning.flatMap((item) => item.effects)[0]);

describe('WorkingSheet', () => {
  it('shows each input as the ledger displays it, the formula and a link to every source', () => {
    const { working } = effect();
    render(<WorkingSheet working={working} />);
    const first = need(working.inputs[0]);
    expect(
      screen.getByText(new RegExp(`${first.label}: ${String(displayValue(first))}`)),
    ).toBeInTheDocument();
    expect(screen.getByText(working.formula)).toBeInTheDocument();
    const fact = need(findFact(need(working.factIds[0])));
    expect(screen.getAllByRole('link', { name: fact.source.title })[0]).toHaveAttribute(
      'href',
      fact.source.url,
    );
  });
});

describe('factsFor', () => {
  it('finds facts in the registry or the extra list and keeps unknown ids as ids', () => {
    const community = need(COMMUNITY_FACTS[0]);
    const found = factsFor(
      ['advice-very-poor-general', community.id, 'no-such-fact', 'no-such-fact'],
      COMMUNITY_FACTS,
    );
    expect(found.map((fact) => (typeof fact === 'string' ? fact : fact.id))).toEqual([
      'advice-very-poor-general',
      community.id,
      'no-such-fact',
    ]);
    expect(factsFor([community.id])).toEqual([community]);
  });
});

describe('Workings', () => {
  it('shows nothing without a figure and a disclosure with one sheet per figure', () => {
    const { container, rerender } = render(<Workings workings={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<Workings workings={[effect(), effect()]} />);
    expect(screen.getByText('Show the working')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Formula' })).toHaveLength(2);
  });

  it('names a factor id with no record in the working', () => {
    const { working } = effect();
    render(<WorkingSheet working={{ ...working, factIds: ['no-such-fact'] }} />);
    expect(screen.getByText('no-such-fact, no source record on this page.')).toBeInTheDocument();
  });
});
