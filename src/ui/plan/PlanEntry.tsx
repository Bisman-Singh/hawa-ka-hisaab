// A plan item as a line of the day: its sums, trade-off, what-if choices and working. A what-if choice
// recomputes in the browser at once with the planner's own function and is announced.
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { Household } from '../../features/household/types.js';
import type { Effect } from '../../features/ledger/types.js';
import type { PlanContext } from '../../features/planner/context.js';
import type { PlanItem } from '../../features/planner/types.js';
import type { Language } from '../../lib/types.js';
import { LedgerEntry } from '../components/Ledger.js';
import { Segmented } from '../components/Segmented.js';
import { useAnnounce } from '../hooks/announcer.js';
import { langOf } from '../i18n/lang.js';
import { Workings } from '../trace/Working.js';
import {
  fixityOf,
  rowsOf,
  sumsOf,
  sumsSentence,
  usableToggles,
  whatIfEffectsOf,
  whoLine,
} from './plan-data.js';
import { PLAN } from './strings.js';

/** Props of a plan item entry: the item, the household and plan context it was made from, and its language. */
export interface ItemEntryProps {
  readonly item: PlanItem;
  readonly household: Household;
  readonly ctx: PlanContext;
  readonly language: Language;
}

const PLANNED = 'planned';

/** What sits below an item: the trade-off, the what-if choice, a note on missing toggles and the working. */
interface More {
  readonly item: PlanItem;
  readonly language: Language;
  readonly choice: ReactElement | null;
  readonly hidden: boolean;
  readonly effects: readonly Effect[];
}

function moreOf({ item, language, choice, hidden, effects }: More): ReactNode {
  if (item.tradeOff === null && choice === null && effects.length === 0) {
    return undefined;
  }
  return (
    <>
      {item.tradeOff === null ? null : (
        <p className="tradeoff">
          <span className="lbl">{PLAN.tradeOff}</span> <span {...langOf(language)}>{item.tradeOff}</span>
        </p>
      )}
      {choice}
      {hidden ? <p className="small">{PLAN.whatIfNeedsForecast}</p> : null}
      <Workings workings={effects} />
    </>
  );
}

/** A plan item. A what-if choice swaps its sums and working for the recomputed ones and announces them. */
export function ItemEntry({ item, household, ctx, language }: ItemEntryProps): ReactElement {
  const [choice, setChoice] = useState(PLANNED);
  const announce = useAnnounce();
  const toggles = usableToggles(ctx, item);
  const effectsFor = (id: string): Effect[] => {
    const toggle = toggles.find((found) => found.id === id);
    return toggle === undefined ? item.effects : whatIfEffectsOf(ctx, toggle);
  };
  const mild = item.kind === 'reassure';
  const effects = effectsFor(choice);
  const choose = (id: string): void => {
    setChoice(id);
    const label = toggles.find((found) => found.id === id)?.label ?? PLAN.asPlanned;
    announce(`${label}. ${sumsSentence(sumsOf(effectsFor(id), mild))}`);
  };
  const options = [
    { value: PLANNED, label: PLAN.asPlanned },
    ...toggles.map((t) => ({ value: t.id, label: t.label })),
  ];
  const segmented = <Segmented legend={PLAN.whatIf} options={options} value={choice} onChange={choose} />;
  const hidden = toggles.length < item.whatIfs.length;
  return (
    <LedgerEntry
      time={item.start ?? ''}
      fixity={fixityOf(household, item)}
      title={<span {...langOf(language)}>{item.title}</span>}
      who={whoLine(household, item)}
      sums={rowsOf(sumsOf(effects, mild))}
      more={moreOf({ item, language, choice: toggles.length === 0 ? null : segmented, hidden, effects })}
    >
      <p className="why">
        <span className="lbl">{PLAN.why}</span> <span {...langOf(language)}>{item.why}</span>
      </p>
    </LedgerEntry>
  );
}
