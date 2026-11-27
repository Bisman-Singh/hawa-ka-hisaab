// A scripted model for the journeys. It answers each task from the request itself, so the real guards check its
// replies; or it fails every call as over quota; or its plan wording carries a number no fact backs.
import { z } from 'zod';
import { noticeReplySchema } from '../../src/features/community/schemas.js';
import { SAMPLE_HOUSEHOLDS } from '../../src/features/household/samples.js';
import { rulesChoice } from '../../src/features/planner/rules-plan.js';
import { candidateActionSchema } from '../../src/features/planner/schemas.js';
import type { JsonValue } from '../../src/lib/json.js';
import type { ModelPort, ModelRequest } from '../../src/lib/model.js';
import { err, ok } from '../../src/lib/result.js';
import type { ToolCallRecord } from '../../src/lib/types.js';

const candidateView = z.object(
  candidateActionSchema.pick({ id: true, kind: true, activityId: true, template: true }).shape,
);
const planData = z.object({ candidates: z.array(candidateView) });
const noticeData = z.object({ wording: noticeReplySchema });
const askData = z.object({
  context: z.object({ household: z.object({ activities: z.array(z.object({ id: z.string() })) }) }),
});
const optionList = z.object({ options: z.array(z.object({ title: z.string() })) });

interface Answer {
  readonly reply: JsonValue;
  readonly calls: ToolCallRecord[];
}

/** The sample household behind a sample sentence, with the room sizes and purifier rating the sentence leaves out. */
function intakeReply(text: string): JsonValue {
  const found = SAMPLE_HOUSEHOLDS.find((sample) => sample.description === text);
  if (found === undefined) {
    return { household: null, unplaced: [], assumed: [] };
  }
  const { home } = found.household;
  const rooms = home.rooms.map((room) => ({
    ...room,
    areaSqFt: null,
    purifier: room.purifier === null ? null : { cadrM3PerHour: null },
  }));
  return { household: { ...found.household, home: { ...home, rooms } }, unplaced: [], assumed: [] };
}

/** A number no fact or calculator gives, which the number check must refuse. */
export const UNBACKED = '999';

function planReply(data: string, unbacked: boolean): JsonValue {
  const items = rulesChoice(planData.parse(JSON.parse(data)).candidates).map((candidate) => ({
    candidateId: candidate.id,
    title: candidate.template.title,
    why: unbacked
      ? `${candidate.template.why} It is ${UNBACKED} times worse outside.`
      : candidate.template.why,
    tradeOff: candidate.template.tradeOff,
  }));
  return { headline: 'A very poor air day. The steps for those most at risk come first.', items };
}

function askReply(request: ModelRequest<unknown>): Answer {
  const activityId = askData.parse(JSON.parse(request.data)).context.household.activities[0]?.id ?? 'a1';
  const tool = request.tools.find((candidate) => candidate.name === 'activity_options');
  const outcome = tool?.call({ activityId });
  const call: ToolCallRecord = outcome?.ok
    ? { name: 'activity_options', args: { activityId }, result: outcome.value, failure: null }
    : { name: 'activity_options', args: { activityId }, result: null, failure: 'unknown_tool' };
  const found = optionList.safeParse(call.result);
  const first = found.success ? found.data.options[0] : undefined;
  const text = first
    ? `The plan suggests this for that outing: ${first.title}.`
    : 'Nothing in the plan covers that.';
  return { reply: { text }, calls: [call] };
}

function replyFor(request: ModelRequest<unknown>, behaviour: Behaviour): Answer {
  switch (request.task) {
    case 'intake':
      return { reply: intakeReply(request.data), calls: [] };
    case 'plan':
      return { reply: planReply(request.data, behaviour === 'misnumbers'), calls: [] };
    case 'notice':
      return { reply: noticeData.parse(JSON.parse(request.data)).wording, calls: [] };
    case 'ask':
      return askReply(request);
    case 'translate':
      throw new Error('the journeys ask for no translation');
  }
}

/** How the scripted model behaves: answers well, is over its quota on every call, or words plans with a stray number. */
export type Behaviour = 'answers' | 'over_quota' | 'misnumbers';

/** The scripted model, with the tasks it was asked, in order. */
export function scriptedModel(behaviour: Behaviour): ModelPort & { readonly tasks: string[] } {
  const tasks: string[] = [];
  return {
    modelId: 'scripted-model',
    tasks,
    generate(request) {
      tasks.push(request.task);
      if (behaviour === 'over_quota') {
        return Promise.resolve(err({ kind: 'quota' }));
      }
      const { reply, calls } = replyFor(request, behaviour);
      const parsed = request.schema.safeParse(reply);
      const rawText = JSON.stringify(reply);
      return Promise.resolve(
        parsed.success
          ? ok({ value: parsed.data, rawText, modelId: 'scripted-model', toolCalls: calls })
          : err({ kind: 'invalid_reply', reply: { rawText, modelId: 'scripted-model' } }),
      );
    },
  };
}
