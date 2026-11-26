// Tests for the sample households: valid, nameless, short enough to type, and clearly different lives.
import { describe, expect, it } from 'vitest';
import { MAX_INTAKE_TEXT_CHARS } from '../../../src/config/limits.js';
import { SAMPLE_HOUSEHOLDS } from '../../../src/features/household/samples.js';
import { householdSchema } from '../../../src/features/household/schemas.js';

describe('sample households', () => {
  it('are three to five valid households with unique ids and sentences a user could type', () => {
    expect(SAMPLE_HOUSEHOLDS.length).toBeGreaterThanOrEqual(3);
    expect(SAMPLE_HOUSEHOLDS.length).toBeLessThanOrEqual(5);
    expect(new Set(SAMPLE_HOUSEHOLDS.map((sample) => sample.id)).size).toBe(SAMPLE_HOUSEHOLDS.length);
    for (const sample of SAMPLE_HOUSEHOLDS) {
      expect(householdSchema.safeParse(sample.household).success).toBe(true);
      expect(sample.description.length).toBeLessThanOrEqual(MAX_INTAKE_TEXT_CHARS);
    }
  });

  it('cover different lives: travel modes, cooking fuels and who is at risk', () => {
    const modes = new Set(
      SAMPLE_HOUSEHOLDS.flatMap((s) =>
        s.household.activities.flatMap((a) => (a.travel ? [a.travel.mode] : [])),
      ),
    );
    const fuels = new Set(SAMPLE_HOUSEHOLDS.map((s) => s.household.home.cookingFuel));
    const flags = new Set(SAMPLE_HOUSEHOLDS.flatMap((s) => s.household.members.flatMap((m) => m.flags)));
    expect(modes.size).toBeGreaterThanOrEqual(4);
    expect(fuels.size).toBeGreaterThanOrEqual(3);
    expect(flags).toEqual(new Set(['asthma_or_lung', 'heart_condition', 'outdoor_worker']));
  });

  it('carry no labels that look like names', () => {
    const labels = SAMPLE_HOUSEHOLDS.flatMap((s) => s.household.activities.map((a) => a.label ?? ''));
    expect(labels.filter((label) => /[A-Z]/.test(label))).toEqual([]);
  });
});
