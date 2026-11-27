// Tests for the upstream call budgets: per client within a request, per instance by minute and by day.
import { describe, expect, it } from 'vitest';
import { asClient, createUpstreamBudget, UNLIMITED } from '../../../src/server/air/budget.js';
import { createFakeClock } from '../../support/fake-clock.js';

const limits = { perClientPerMinute: 2, perMinute: 3, perDay: 4 };

async function allowed(budget: ReturnType<typeof createUpstreamBudget>, client: string, times: number) {
  const answers: boolean[] = [];
  for (let index = 0; index < times; index += 1) {
    answers.push(await asClient(client, () => budget.allow()));
  }
  return answers;
}

describe('createUpstreamBudget', () => {
  it('charges the client in scope first, so one client cannot spend the whole instance minute', async () => {
    const budget = createUpstreamBudget(limits, createFakeClock());
    expect(await allowed(budget, 'a', 3)).toEqual([true, true, false]);
    expect(await allowed(budget, 'b', 2)).toEqual([true, false]);
  });

  it('holds the instance to its day as well as its minute, and charges calls outside a request to one key', async () => {
    const clock = createFakeClock();
    const budget = createUpstreamBudget(limits, clock);
    expect(await allowed(budget, 'a', 2)).toEqual([true, true]);
    clock.advance(60_000);
    expect(await allowed(budget, 'b', 2)).toEqual([true, true]);
    clock.advance(60_000);
    expect(await allowed(budget, 'c', 1)).toEqual([false]);
    clock.advance(24 * 3_600_000);
    expect([await budget.allow(), await budget.allow(), await budget.allow()]).toEqual([true, true, false]);
  });

  it('has an unlimited budget for providers built without one', async () => {
    expect(await UNLIMITED.allow()).toBe(true);
  });
});
