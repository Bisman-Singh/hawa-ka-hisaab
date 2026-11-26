// POST /api/intake: the person's description turned into a household by the model, or unavailable with the
// reason, never an error page. The form works either way. Identical texts within a few minutes reuse the result.
import { runIntake, type IntakeReply } from '../../features/assistant/intake.js';
import { intakeRoute } from '../../features/household/contract.js';
import { ok } from '../../lib/result.js';
import type { RouteModule } from '../deps.js';
import { createModelRoute, logFallback, runFor } from '../model-route.js';
import { mountPost } from '../mount.js';

/** Registers the intake route. The per-client model limit is taken only when the model would be called. */
export const registerIntake: RouteModule = (target) => {
  const route = createModelRoute<IntakeReply>(target.deps, intakeRoute.path);
  mountPost(target, intakeRoute, async (body, meta) => {
    const result = await runIntake(runFor(route, meta, target.deps.clock.now()), body.text);
    if (result.kind === 'fallback') {
      logFallback(route, result.reason);
      return ok({ outcome: 'unavailable', reason: result.reason, trace: result.trace });
    }
    return ok({ outcome: 'parsed', ...result.value, trace: result.trace });
  });
};
