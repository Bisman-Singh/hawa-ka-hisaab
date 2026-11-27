// Tests for the working: inputs as the ledger shows them, the formula, each source once with its factors and a
// link, facts from the registry alone, an unknown id named, and the sheet English under a Hindi summary.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findFact } from '../../../src/config/facts/index.js';
import { displayValue } from '../../../src/features/ledger/format.js';
import { purifierNeed } from '../../../src/features/ledger/purifier.js';
import type { WorkingInput } from '../../../src/features/ledger/types.js';
import { factsFor, sourceGroups, Workings } from '../../../src/ui/trace/Working.js';
import { need, planResponse } from '../plan/fixtures.js';
import { sampleCo2Effect, sampleExposureEffect, sampleWorking } from '../../support/samples.js';

const effect = () =>
  need(planResponse('family-car-asthma', 'poor').plan.slots.morning.flatMap((item) => item.effects)[0]);

describe('Workings', () => {
  it('shows each input as the ledger displays it, the formula and a link to every source', () => {
    const { working } = effect();
    render(<Workings workings={[effect()]} />);
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

  it('names each block of inputs and formula by its effect when an item shows more than one', () => {
    render(<Workings workings={[sampleExposureEffect(), sampleCo2Effect()]} />);
    const headings = screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent);
    expect(headings).toEqual([
      'Breathed in: inputs',
      'Breathed in: formula',
      'Travel CO₂: inputs',
      'Travel CO₂: formula',
      'Factors and sources',
    ]);
  });

  it('names each block of a figure by its label when more than one figure shows', () => {
    render(<Workings workings={[purifierNeed(120), purifierNeed(240)]} />);
    expect(
      screen.getAllByRole('heading', { name: 'Smallest purifier CADR for this room: inputs' }),
    ).toHaveLength(2);
  });

  it('writes a count of one in the singular, such as 1 person and 1 leg', () => {
    const own = (label: string, value: number, unit: string): WorkingInput => ({
      label,
      value,
      unit,
      from: 'household',
      factId: null,
    });
    const inputs = [
      own('people in the vehicle', 1, 'people'),
      own('legs', 1, 'legs'),
      own('people sharing', 2, 'people'),
    ];
    const working = { ...sampleWorking(), inputs };
    render(<Workings workings={[{ ...sampleCo2Effect(), working }]} />);
    expect(screen.getByText('people in the vehicle: 1 person, from your form.')).toBeInTheDocument();
    expect(screen.getByText('legs: 1 leg, from your form.')).toBeInTheDocument();
    expect(screen.getByText('people sharing: 2 people, from your form.')).toBeInTheDocument();
  });

  it('shows nothing without a figure, and one sheet per figure with the sources listed once', () => {
    const { container, rerender } = render(<Workings workings={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<Workings workings={[effect(), effect()]} />);
    expect(screen.getByText('Show the working')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Breathed in: formula' })).toHaveLength(2);
    expect(screen.getAllByRole('heading', { name: 'Factors and sources' })).toHaveLength(1);
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(new Set(links).size).toBe(links.length);
  });

  it('takes a summary in the plan language and keeps the sheet English', () => {
    const { container } = render(<Workings workings={[effect()]} summary="पूरा हिसाब देखें" />);
    expect(screen.getByText('पूरा हिसाब देखें')).toBeInTheDocument();
    expect(container.querySelector('.sheet > div')).toHaveAttribute('lang', 'en');
  });

  it('names a factor id with no record in the working', () => {
    const working = { ...effect().working, factIds: ['no-such-fact'] };
    render(<Workings workings={[{ ...effect(), working }]} />);
    expect(screen.getByText('no-such-fact, no source record on this page.')).toBeInTheDocument();
  });
});

describe('sourceGroups', () => {
  it('lists a source once with the title of every fact it backs, and an unknown id alone', () => {
    const one = need(findFact('exposure-ratio-car-ac'));
    const same = need(findFact('exposure-ratio-bus'));
    expect(same.source.url).toBe(one.source.url);
    const groups = sourceGroups([one.id, same.id, 'no-such-fact', one.id]);
    expect(groups).toEqual([
      { key: one.source.url, titles: [one.title, same.title], source: one.source },
      { key: 'no-such-fact', titles: ['no-such-fact'], source: null },
    ]);
  });
});

describe('factsFor', () => {
  it('finds every fact in the registry, community facts too, and keeps unknown ids as ids', () => {
    const community = need(findFact('community-share-dg-sets'));
    const found = factsFor(['advice-very-poor-general', community.id, 'no-such-fact', 'no-such-fact']);
    expect(found.map((fact) => (typeof fact === 'string' ? fact : fact.id))).toEqual([
      'advice-very-poor-general',
      community.id,
      'no-such-fact',
    ]);
  });
});
