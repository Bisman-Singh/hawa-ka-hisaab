// Tests for the computed facts: plain sums of what was entered, set beside cited shares, never an emission figure.
import { describe, expect, it } from 'vitest';
import { buildFigures } from '../../../src/features/community/figures.js';
import type { Timing } from '../../../src/features/community/timing.js';
import type { CommunityInput } from '../../../src/features/community/types.js';
import { figureSchema } from '../../../src/features/ledger/schemas.js';
import { fullSchool, fullSociety } from './support.js';

const WINDOW: Timing = {
  window: { start: 13, end: 16 },
  periods: [
    { start: '08:50', worse: true },
    { start: '13:10', worse: false },
  ],
};
const NO_WINDOW: Timing = { window: null, periods: [] };

describe('buildFigures', () => {
  it('gives a school its pupils and staff, generator hours, gate idling and periods in the dirtier hours', () => {
    const figures = buildFigures(fullSchool(), WINDOW);
    expect(figures.map(({ figure }) => [figure.unit, figure.value])).toEqual([
      ['people', 424],
      ['hours a day', 2.5],
      ['vehicle-minutes a day', 822],
      ['outdoor periods', 1],
    ]);
    expect(figures.filter(({ figure }) => !figureSchema.safeParse(figure).success)).toEqual([]);
  });

  it('shows the working: each term entered, and each cited share with its fact id', () => {
    const idling = buildFigures(fullSociety(), NO_WINDOW).find(
      ({ figure }) => figure.unit === 'vehicle-minutes a day',
    );
    expect(idling?.figure.value).toBe(583.5);
    expect(idling?.figure.working.inputs.map((input) => [input.value, input.from, input.factId])).toEqual([
      [389, 'community', null],
      [1.5, 'community', null],
      [28, 'fact', 'community-share-transport'],
      [2016, 'fact', 'community-study-winter'],
    ]);
    expect(idling?.figure.working.formula).toContain('not an emission figure');
    expect(idling?.facts.map((fact) => fact.id)).toContain('computed-idling-vehicle-minutes');
  });

  it("adds a society's own counts and leaves the figure out when none was entered", () => {
    const society = buildFigures(fullSociety(), NO_WINDOW).find(({ figure }) => figure.unit === 'people');
    expect(society?.figure.value).toBe(107);
    expect(society?.figure.working.formula).toBe(
      'The sum of the counts you entered: children, older adults, outdoor staff.',
    );
    const bare: CommunityInput = { ...fullSociety(), children: null, olderAdults: null, outdoorStaff: null };
    expect(buildFigures(bare, NO_WINDOW).map(({ figure }) => figure.unit)).not.toContain('people');
  });

  it('shows nothing it cannot cite: no gas generator, no idle gate and no timing without a window', () => {
    const quiet: CommunityInput = {
      ...fullSociety(),
      generator: { hoursPerDay: 5, kva: null, fuel: 'gas' },
      gateIdling: null,
    };
    expect(buildFigures(quiet, NO_WINDOW).map(({ figure }) => figure.unit)).toEqual(['people']);
    const noPeriods: CommunityInput = { ...fullSchool(), outdoorPeriods: [] };
    expect(buildFigures(noPeriods, WINDOW).map(({ figure }) => figure.unit)).not.toContain('outdoor periods');
  });
});
