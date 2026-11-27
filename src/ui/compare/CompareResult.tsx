// The comparison of two plans made on the same air: both households, then one row per topic marked as differing
// or the same with the reason, or the different-air message when the readings under the two plans differ.
import { Button } from '../components/Button.js';
import type { ReactElement } from 'react';
import { describeMember } from '../../features/household/members.js';
import type { Household } from '../../features/household/types.js';
import { COMPARE_TOPICS, comparePlans } from '../../features/planner/compare.js';
import type { CompareTopic, PlanDifference } from '../../features/planner/compare.js';
import type { AirBasis, PlanResponse } from '../../features/planner/types.js';
import { StateMessage } from '../components/StateMessage.js';
import { WrittenBy } from '../components/WrittenBy.js';
import { istClock } from '../../lib/time.js';
import { AirBasisLine } from '../plan/air-basis.js';
import { BandLabel } from '../components/Band.js';
import { useAppState } from '../state/app-state.js';
import { COMPARE, TOPICS } from './words.js';

/** One row: the topic, whether it differs, each side's words and the reason. */
export function CompareRow({
  topic,
  found,
}: {
  readonly topic: CompareTopic;
  readonly found: PlanDifference | undefined;
}): ReactElement {
  return (
    <li>
      <h3>
        {TOPICS[topic].title}
        <span className="vh">:</span>{' '}
        <span className={found ? 'differs' : 'same'}>{found ? COMPARE.differs : COMPARE.same}</span>
      </h3>
      {found ? (
        <div className="cmp-cols">
          <div>
            <p>
              <span className="lbl">{COMPARE.mineLead}</span> {found.left}
            </p>
          </div>
          <div>
            <p>
              <span className="lbl">{COMPARE.theirsLead}</span> {found.right}
            </p>
          </div>
        </div>
      ) : (
        <p>{COMPARE.sameText}</p>
      )}
      <p className="because">
        <span className="lbl">{COMPARE.why}</span> {found ? TOPICS[topic].why : COMPARE.sameWhy}
      </p>
    </li>
  );
}

/** The band and hour both plans were made on, from the plans' own air basis. */
export function SameAir({ basis }: { readonly basis: AirBasis }): ReactElement {
  return (
    <>
      {COMPARE.sameAir} {basis.band === null ? COMPARE.noBand : <BandLabel band={basis.band} />}
      {basis.readingHour === null ? '.' : `, ${COMPARE.readingFor} ${istClock(basis.readingHour)} IST.`}
    </>
  );
}

/** Props of the result: both households and both plan responses. */
export interface CompareResultProps {
  readonly mine: { readonly household: Household; readonly response: PlanResponse };
  readonly theirs: {
    readonly household: Household;
    readonly response: PlanResponse;
    readonly description: string;
  };
  readonly again: () => void;
}

/** The comparison, or the different-air message when the two plans were made on different readings. */
export function CompareResult({ mine, theirs, again }: CompareResultProps): ReactElement {
  const { reading } = useAppState();
  const side = (s: CompareResultProps['mine']) => ({ household: s.household, ...s.response });
  const result = comparePlans(side(mine), side(theirs));
  if (!result.ok) {
    return (
      <StateMessage tone="alert" glyph="stale" title={COMPARE.airTitle}>
        <p>{COMPARE.airBody}</p>
        <Button onClick={again}>{COMPARE.again}</Button>
      </StateMessage>
    );
  }
  return (
    <>
      <p className="lede">
        <SameAir basis={mine.response.airBasis} />{' '}
        <AirBasisLine basis={mine.response.airBasis} air={reading} />
      </p>
      <div className="cmp-head">
        <div>
          <h2>{COMPARE.yours}</h2>
          <p>{mine.household.members.map(describeMember).join('; ')}</p>
          <p>
            <WrittenBy producedBy={mine.response.trace.producedBy} />
          </p>
        </div>
        <div>
          <h2>{COMPARE.theirs}</h2>
          <p>{theirs.description}</p>
          <p>
            <WrittenBy producedBy={theirs.response.trace.producedBy} />
          </p>
        </div>
      </div>
      <ol className="cmp">
        {COMPARE_TOPICS.map((topic) => (
          <CompareRow key={topic} topic={topic} found={result.value.find((line) => line.topic === topic)} />
        ))}
      </ol>
    </>
  );
}
