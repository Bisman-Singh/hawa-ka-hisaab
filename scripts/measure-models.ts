// Measures real Gemini models through the app's own adapter and pipelines: latency, structured output, tool calls
// and the guards. It makes live calls on the key in GEMINI_API_KEY, so it is never part of the gate.
import { GoogleGenAI } from '@google/genai';
import { answerQuestion } from '../src/features/assistant/ask.js';
import { runIntake } from '../src/features/assistant/intake.js';
import type { Guarded } from '../src/features/assistant/guarded.js';
import { systemClock } from '../src/lib/clock.js';
import type { ModelPort } from '../src/lib/model.js';
import { createFixedWindowLimiter } from '../src/lib/rate-limit.js';
import type { Trace } from '../src/lib/types.js';
import { createGeminiModel, type Fetch } from '../src/server/gemini.js';
import { wordNotice } from '../src/features/assistant/notice.js';
import { HOSTILE, oneShot, runOf, SAMPLE_TEXT } from './model-samples.js';
import { askSample, sampleNoticeReport } from './model-samples.js';

interface Sample {
  readonly status: number;
  readonly ms: number;
  readonly detail: string;
}

function timedFetch(samples: Sample[]): Fetch {
  return async (input, init) => {
    const started = performance.now();
    const response = await fetch(input, init);
    const ms = Math.round(performance.now() - started);
    const detail = response.ok
      ? ''
      : (await response.clone().text()).match(/"(quotaId|retryDelay|status|message)": "[^"]{0,300}/g);
    samples.push({ status: response.status, ms, detail: Array.isArray(detail) ? detail.join(' ') : '' });
    return response;
  };
}

function report(
  label: string,
  result: Guarded<unknown> | { kind: string; trace: Trace },
  samples: Sample[],
): void {
  const check = result.trace.numberCheck;
  const reason = 'reason' in result ? result.reason : '';
  const calls = samples.map((sample) =>
    `${String(sample.status)}/${String(sample.ms)}ms ${sample.detail}`.trim(),
  );
  console.log(
    `${label}: ${result.kind} ${reason} check=${check.status} unmatched=[${check.unmatched.join(',')}]`,
  );
  const tools = result.trace.toolCalls.map((call) => `${call.name}${JSON.stringify(call.args)}`).join(' ');
  console.log(`  http=${calls.join(' | ')} tools=${tools}`);
  console.log(`  reply=${(result.trace.modelReply ?? '').replace(/\s+/g, ' ').slice(0, 1800)}`);
  samples.length = 0;
}

function port(model: string, samples: Sample[], apiKey: string): ModelPort {
  const callCap = createFixedWindowLimiter({
    limit: 50,
    windowMs: 86_400_000,
    maxKeys: 1,
    clock: systemClock,
  });
  const options = {
    apiKey,
    models: [model],
    timeoutMs: 60_000,
    attemptMs: 60_000,
    callCap,
    clock: systemClock,
  };
  return oneShot(createGeminiModel({ ...options, fetch: timedFetch(samples) }));
}

async function measure(models: readonly string[], apiKey: string, askToo = true): Promise<void> {
  const samples: Sample[] = [];
  for (const model of models) {
    report(`${model} intake`, await runIntake(runOf(port(model, samples, apiKey)), SAMPLE_TEXT), samples);
    const question = 'Should I take the metro instead of driving today, and how much CO2 does it save?';
    const input = askSample(question);
    if (askToo) {
      report(`${model} ask`, await answerQuestion(runOf(port(model, samples, apiKey)), input), samples);
    }
  }
}

async function inject(model: string, apiKey: string): Promise<void> {
  const samples: Sample[] = [];
  for (const text of HOSTILE.intake) {
    report(`inject intake`, await runIntake(runOf(port(model, samples, apiKey)), text), samples);
  }
  for (const question of HOSTILE.ask) {
    const input = askSample(question);
    report(`inject ask`, await answerQuestion(runOf(port(model, samples, apiKey)), input), samples);
  }
}

async function notice(model: string, apiKey: string): Promise<void> {
  const samples: Sample[] = [];
  report('notice', await wordNotice(runOf(port(model, samples, apiKey)), sampleNoticeReport()), samples);
}

async function list(apiKey: string): Promise<void> {
  for await (const model of await new GoogleGenAI({ apiKey }).models.list({ config: { pageSize: 200 } })) {
    const usable =
      (model.supportedActions ?? []).includes('generateContent') && /flash|pro/.test(model.name ?? '');
    console.log(usable ? `${model.name ?? ''} out=${String(model.outputTokenLimit)}` : '');
  }
}

const apiKey = process.env['GEMINI_API_KEY'] ?? '';
const [mode = '', ...models] = process.argv.slice(2);
if (apiKey === '') {
  console.error('GEMINI_API_KEY is not set, so nothing was sent.');
  process.exit(1);
}
const runs: Readonly<Record<string, () => Promise<void>>> = {
  list: () => list(apiKey),
  measure: () => measure(models, apiKey),
  intake: () => measure(models, apiKey, false),
  inject: () => inject(models[0] ?? '', apiKey),
  notice: () => notice(models[0] ?? '', apiKey),
};
await (runs[mode] ?? (() => Promise.reject(new Error('Use list, measure <models...> or inject <model>.'))))();
