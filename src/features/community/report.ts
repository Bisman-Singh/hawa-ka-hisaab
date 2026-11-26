// Builds the community report: computed facts, ranked actions and the rules notice in English and Hindi, all
// from the inputs, the air reading, the forecast and GRAP. No model is involved; a model may only reword it later.
import type { Language } from '../../lib/types.js';
import { readingBand } from '../air/reading-facts.js';
import type { AirReading } from '../air/types.js';
import { dayKindForBand } from '../planner/day-kind.js';
import { buildFigures } from './figures.js';
import { istParts } from './format.js';
import { assembleNotice } from './notice.js';
import { createRenderer, uniqueFacts, type Renderer } from './render.js';
import { selectActions, type ActionId } from './rules.js';
import {
  ACTIONS_EN_DAY,
  type ActionText,
  type FrameText,
  type PerKind,
  type ReadingState,
} from './text-en.js';
import { ACTIONS_EN_MORE, FRAME_EN } from './text-en-more.js';
import { ACTIONS_EN_TIME } from './text-en-time.js';
import { ACTIONS_HI_MORE } from './text-hi-more.js';
import { ACTIONS_HI_DAY, FRAME_HI } from './text-hi.js';
import { analyseTiming } from './timing.js';
import type { CommunityAction, CommunityContext, CommunityKind, CommunityReport } from './types.js';
import type { NoticeFrame, NoticeWording } from './types.js';
import { templateValues } from './values.js';

const ACTIONS_EN: Readonly<Record<ActionId, ActionText>> = {
  ...ACTIONS_EN_DAY,
  ...ACTIONS_EN_TIME,
  ...ACTIONS_EN_MORE,
};
const ACTIONS_HI: Readonly<Record<ActionId, PerKind>> = { ...ACTIONS_HI_DAY, ...ACTIONS_HI_MORE };
const FRAMES: Readonly<Record<Language, FrameText>> = { en: FRAME_EN, hi: FRAME_HI };

function readingState(reading: AirReading): ReadingState {
  if (reading.path === 'station') {
    return reading.aqi === null ? 'station_no_aqi' : 'station';
  }
  return readingBand(reading) === null ? 'none' : 'modelled';
}

function frameIn(lang: Language, context: CommunityContext, { fill }: Renderer): NoticeFrame {
  const frame = FRAMES[lang];
  const kind = context.community.kind;
  const stale = context.reading.path === 'station' && context.reading.stale ? frame.stale : '';
  const opening = `${frame.greeting[kind]} ${frame.reading[readingState(context.reading)]}${stale}`;
  return { opening: fill(opening, lang), closing: fill(frame.closing[kind], lang) };
}

function actionOf(id: ActionId, kind: CommunityKind, { fill }: Renderer): CommunityAction {
  const text = ACTIONS_EN[id];
  return {
    id,
    title: fill(text.title[kind], 'en'),
    detail: fill(text.detail[kind], 'en'),
    factIds: text.factIds[kind].map((factId) => fill(factId, 'en')),
  };
}

interface Draft {
  readonly ids: readonly ActionId[];
  readonly kind: CommunityKind;
  readonly renderer: Renderer;
}

function wordingIn(lang: Language, { ids, kind, renderer }: Draft): NoticeWording {
  const line = (id: ActionId): string => (lang === 'en' ? ACTIONS_EN[id].line[kind] : ACTIONS_HI[id][kind]);
  return {
    title: renderer.fill(FRAMES[lang].title[kind], lang),
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
