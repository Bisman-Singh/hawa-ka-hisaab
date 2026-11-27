// A plan item as a line of the day: its sums, trade-off, what-if choices and working. A what-if choice
// recomputes in the browser at once with the planner's own function and is announced.
import { type ReactElement, type ReactNode, useState } from 'react';
import type { Household } from '../../features/household/types.js';
import type { Effect } from '../../features/ledger/types.js';
import type { PlanContext } from '../../features/planner/context.js';
import type { PlanItem } from '../../features/planner/types.js';
import type { Language } from '../../lib/types.js';
import { LedgerEntry } from '../components/Ledger.js';
import { Segmented } from '../components/Segmented.js';
import { useAnnounce } from '../hooks/announcer.js';
import { Workings } from '../trace/Working.js';
import { notesOf, rowsOf, sumsOf, sumsSentence, usableToggles, whatIfEffectsOf } from './plan-data.js';
import type { Sum } from './plan-data.js';
import { fixityOf, whoLine } from './plan-words.js';
import { PLAN_LABELS } from './words.js';

/** Props of a plan item entry: the item, the household and plan context it was made from, and its language. */
export interface ItemEntryProps {
  readonly item: PlanItem;
  readonly household: Household;
  readonly ctx: PlanContext;
  readonly language: Language;
}

const PLANNED = 'planned';

/** What sits below an item: the trade-off, why a range is wide, the what-if choice, a note and the working. */
interface More {
  readonly item: PlanItem;
  readonly language: Language;
  readonly choice: ReactElement | null;
  readonly hidden: boolean;
  readonly effects: readonly Effect[];
  readonly sums: readonly Sum[];
}

function moreOf({ item, language, choice, hidden, effects, sums }: More): ReactNode {
  const words = PLAN_LABELS[language];
  const explained = item.kind === 'swap_mode' && item.tradeOff !== null;
  const notes = notesOf(explained ? sums.filter((sum) => sum.kind !== 'exposure') : sums);
  if (item.tradeOff === null && choice === null && effects.length === 0) {
    return undefined;
  }
  return (
    <>
      {item.tradeOff === null ? null : (
        <p className="tradeoff">
          <span className="lbl">{words.tradeOff}</span> {item.tradeOff}
        </p>
      )}
      {notes.map((note) => (
        <p key={note} className="small">
          {note}
        </p>
      ))}
      {choice}
      {hidden ? <p className="small">{words.whatIfNeedsForecast}</p> : null}
      <Workings workings={effects} summary={words.working} />
    </>
  );
}

/** A plan item. A what-if choice swaps its sums and working for the recomputed ones and announces them. */
export function ItemEntry({ item, household, ctx, language }: ItemEntryProps): ReactElement {
  const [choice, setChoice] = useState(PLANNED);
  const announce = useAnnounce();
  const words = PLAN_LABELS[language];
  const toggles = usableToggles(ctx, item);
  const effectsFor = (id: string): Effect[] => {
    const toggle = toggles.find((found) => found.id === id);
    return toggle === undefined ? item.effects : whatIfEffectsOf(ctx, toggle);
  };
  const mild = item.kind === 'reassure';
  const effects = effectsFor(choice);
  const sums = sumsOf(effects, mild, language);
  const choose = (id: string): void => {
    setChoice(id);
    const label = toggles.find((found) => found.id === id)?.label ?? words.asPlanned;
    announce(`${label}. ${sumsSentence(sumsOf(effectsFor(id), mild, language))}`, language);
  };
  const options = [
    { value: PLANNED, label: words.asPlanned },
    ...toggles.map((t) => ({ value: t.id, label: t.label })),
  ];
  const segmented = <Segmented legend={words.whatIf} options={options} value={choice} onChange={choose} />;
  const hidden = toggles.length < item.whatIfs.length;
  const more = { item, language, choice: toggles.length === 0 ? null : segmented, hidden, effects, sums };
  return (
    <LedgerEntry
      time={item.start ?? ''}
      fixity={fixityOf(household, item, language)}
      title={item.title}
      who={whoLine(household, item, language)}
      sums={rowsOf(sums)}
      more={moreOf(more)}
    >
      <p className="why">
        <span className="lbl">{words.why}</span> {item.why}
      </p>
    </LedgerEntry>
  );
}
