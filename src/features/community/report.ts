// Builds the community report: computed facts, ranked actions and the rules notice in English and Hindi, all
// from the inputs, the air reading, the forecast and GRAP. No model is involved; a model may only reword it later.
import type { Language } from '../../lib/types.js';
import { readingBand } from '../air/reading-facts.js';
import type { AirReading } from '../air/types.js';
import { dayKindForBand } from '../planner/day-kind.js';
import { buildFigures } from './figures.js';
import { istParts } from '../../lib/time.js';
import { assembleNotice } from './notice.js';
import { createRenderer, uniqueFacts, type Renderer } from './render.js';
import { selectActions, type ActionId } from './rules.js';
import { analyseTiming } from './timing.js';
import type {
  CommunityAction,
  CommunityContext,
  CommunityKind,
  CommunityReport,
  NoticeFrame,
  NoticeWording,
} from './types.js';
import { templateValues } from './values.js';
import { ACTIONS, forKind, FRAMES, type ReadingState } from './words.js';

function readingState(reading: AirReading): ReadingState {
  if (reading.path === 'station') {
    return reading.aqi === null ? 'station_no_aqi' : 'station';
  }
  return readingBand(reading) === null ? 'none' : 'modelled';
}

/** A reading from before this hour of the night says to check again in the morning. */
export const EARLY_BEFORE_HOUR = 6;

function nightReading(reading: AirReading): boolean {
  const hour =
    reading.path === 'station' ? reading.readingHour : reading.path === 'modelled' ? reading.modelHour : null;
  return hour !== null && istParts(Date.parse(hour)).hour < EARLY_BEFORE_HOUR;
}

function frameIn(lang: Language, context: CommunityContext, { fill }: Renderer): NoticeFrame {
  const frame = FRAMES[lang];
  const kind = context.community.kind;
  const stale = context.reading.path === 'station' && context.reading.stale ? frame.stale : '';
  const early = nightReading(context.reading) ? frame.early : '';
  const opening = `${forKind(frame.greeting, kind)} ${frame.reading[readingState(context.reading)]}${stale}${early}`;
  return { opening: fill(opening, lang), closing: fill(forKind(frame.closing, kind), lang) };
}

function actionOf(id: ActionId, kind: CommunityKind, { fill }: Renderer): CommunityAction {
  const text = ACTIONS[id];
  return {
    id,
    title: fill(forKind(text.title, kind), 'en'),
    detail: fill(forKind(text.detail, kind), 'en'),
    factIds: forKind(text.factIds, kind).map((factId) => fill(factId, 'en')),
  };
}

interface Draft {
  readonly ids: readonly ActionId[];
  readonly kind: CommunityKind;
  readonly renderer: Renderer;
}

function wordingIn(lang: Language, { ids, kind, renderer }: Draft): NoticeWording {
  const line = (id: ActionId): string => forKind(ACTIONS[id].line[lang], kind);
  return {
    title: renderer.fill(forKind(FRAMES[lang].title, kind), lang),
    actions: ids.map((id) => ({ id, text: renderer.fill(line(id), lang) })),
  };
}

/**
 * Builds the report for one society or school on the IST day of context.now: the computed facts, the actions
 * that apply in rank order, the rules wording in both languages, the served notice and its fact set.
 */
export function buildCommunityReport(context: CommunityContext): CommunityReport {
  const today = istParts(context.now);
  const band = readingBand(context.reading);
  const kind = context.community.kind;
  const timing = analyseTiming(context.community, context.forecast, today.date);
  const renderer = createRenderer(templateValues(context, { band, timing, date: today.date }));
  const ids = selectActions({
    community: context.community,
    band,
    timing,
    grap: context.grap,
    month: today.month,
  });
  const draft: Draft = { ids, kind, renderer };
  const wording = { en: wordingIn('en', draft), hi: wordingIn('hi', draft) };
  const frame = { en: frameIn('en', context, renderer), hi: frameIn('hi', context, renderer) };
  const figures = buildFigures(context.community, timing);
  return {
    kind,
    date: today.date,
    band,
    dayKind: dayKindForBand(band),
    facts: figures.map((item) => item.figure),
    actions: ids.map((id) => actionOf(id, kind, renderer)),
    wording,
    frame,
    notice: assembleNotice(wording, frame),
    factSet: uniqueFacts([...renderer.factSet(), ...figures.flatMap((item) => item.facts)]),
  };
}
