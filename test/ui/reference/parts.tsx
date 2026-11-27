// Parts of the component reference: state messages and waiting, the ledger, the sheet and Hindi text.
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { DialogSheet } from '../../../src/ui/components/DialogSheet.js';
import { Disclosure } from '../../../src/ui/components/Disclosure.js';
import { LeaderRows, LedgerEntry, LedgerSlot, TotalTable } from '../../../src/ui/components/Ledger.js';
import { ProgressSteps, Skeleton } from '../../../src/ui/components/Progress.js';
import { RequestFailure } from '../../../src/ui/components/RequestFailure.js';
import { Segmented } from '../../../src/ui/components/Segmented.js';
import { StateMessage } from '../../../src/ui/components/StateMessage.js';
import { WrittenBy } from '../../../src/ui/components/WrittenBy.js';

export function Part({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <section className="sec" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

export function States(): ReactElement {
  return (
    <Part id="ref-states" title="State messages, stamps and waiting">
      <StateMessage tone="status" glyph="start" title="Start with your place" quiet>
        <p>The air card shows the reading from the nearest station.</p>
      </StateMessage>
      <StateMessage tone="alert" glyph="location" title="Location is turned off for this site">
        <p>Type your city, town or PIN code instead.</p>
      </StateMessage>
      <StateMessage tone="status" glyph="stale" title="This reading is stale">
        <p>It is for 02:00 IST. The plan treats it as old.</p>
      </StateMessage>
      <StateMessage tone="status" glyph="model" title="The model is not answering right now" quiet>
        <p>So this plan uses fixed wording. The numbers come from the same rules.</p>
        <button className="btn btn-quiet" type="button">
          Try the model again
        </button>
      </StateMessage>
      <StateMessage tone="status" glyph="offline" title="You are offline" quiet>
        <p>New readings and plans need a connection.</p>
      </StateMessage>
      <RequestFailure
        failure={{ kind: 'api', status: 503, code: 'upstream_unavailable', retryAfterSeconds: null }}
        retry={() => undefined}
      />
      <p className="path">
        <WrittenBy producedBy="model" />
        <WrittenBy producedBy="rules" />
        <WrittenBy producedBy="fixed_reply" />
      </p>
      <ProgressSteps
        steps={[
          { label: 'Read the air for the sample place', state: 'done' },
          { label: 'Worked out the figures in code', state: 'done' },
          { label: 'Choosing and wording the steps', state: 'now' },
        ]}
      />
      <div aria-busy="true">
        <p className="status" role="status">
          Reading the feed for the sample place
        </p>
        <Skeleton size="w80" tall />
        <Skeleton size="w60" />
        <Skeleton size="big" />
        <Skeleton size="w45" />
        <Skeleton size="w30" />
        <Skeleton size="num" />
        <ol className="ledger" aria-hidden="true">
          <li className="entry">
            <div className="when">
              <Skeleton size="w80" />
            </div>
            <div className="what">
              <Skeleton size="w45" tall />
              <Skeleton size="w80" />
            </div>
            <dl className="leaders sums">
              <div>
                <dt>
                  <Skeleton size="w60" />
                </dt>
                <dd>
                  <Skeleton size="num" />
                </dd>
              </div>
            </dl>
          </li>
        </ol>
      </div>
    </Part>
  );
}

export function Ledger(): ReactElement {
  const [mode, setMode] = useState<'auto' | 'cycle'>('auto');
  return (
    <Part id="ref-ledger" title="Ledger">
      <LedgerSlot title="Morning" hours="05:00 to 12:00" air="Forecast 142 to 242">
        <LedgerEntry
          time="06:30"
          fixity="can move"
          title="Park walk"
          who="Older adult, 30 minutes"
          moved="Moved to 14:00"
        >
          <p className="why">
            <span className="lbl">Why.</span> The forecast is at its highest from 05 to 08.
          </p>
        </LedgerEntry>
        <LedgerEntry
          time="07:15"
          fixity="fixed"
          title="School ride"
          who="Child with asthma, 3 km"
          sums={[
            {
              label: 'Ride dose',
              figure: mode === 'auto' ? '77% less' : 'No change',
              range: 'range 61 to 91%',
            },
            { label: 'CO₂', figure: mode === 'auto' ? '0.11 kg more' : 'None', range: 'each way, 3 riders' },
          ]}
          more={
            <>
              <p className="tradeoff">
                <span className="lbl">Trade-off.</span> The auto adds CO₂; the cycle adds none but raises the
                dose.
              </p>
              <Segmented
                legend="What if he goes by"
                name="ref-what-if"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'auto', label: 'Shared auto' },
                  { value: 'cycle', label: 'Cycle' },
                ]}
              />
              <Disclosure open>
                <h4>Formula</h4>
                <div className="formula">
                  <div>CO₂: 3 km × 0.10768 kg per km ÷ 3 riders</div>
                  <div className="res">0.11 kg each way</div>
                </div>
              </Disclosure>
            </>
          }
        >
          <p className="do">Go by shared auto today, not by cycle.</p>
        </LedgerEntry>
      </LedgerSlot>
      <LedgerSlot title="Afternoon" hours="12:00 to 17:00">
        <LedgerEntry
          time="13:00"
          fixity="home"
          title="Open the windows until 16:00"
          sums={[{ label: 'Effect', none: 'No figure. No measured factor for Indian homes.' }]}
        />
      </LedgerSlot>
      <TotalTable
        caption="The day's reckoning"
        rows={[
          { label: 'Travel CO₂ on your usual day', value: '2.34 kg' },
          { label: 'Travel CO₂ with this plan', value: '0.49 kg' },
        ]}
        total={{ label: 'Difference', value: '1.85 kg less' }}
      >
        <p className="note">
          {"Doses are relative to each person's usual day. They are not added across people."}
        </p>
      </TotalTable>
      <LeaderRows
        kind="calc"
        rows={[
          { label: 'Room', figure: '12 m²' },
          { label: 'Ceiling', figure: '3 m' },
        ]}
        total={{ label: 'Clean air needed', figure: '240 m³ per hour' }}
      />
    </Part>
  );
}

export function Sheet(): ReactElement {
  const [open, setOpen] = useState(
    () => new URLSearchParams(window.location.search).get('dialog') === 'open',
  );
  return (
    <Part id="ref-sheet" title="How this was made, and Hindi text">
      <button
        className="linkbtn"
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        How this was made
      </button>
      <DialogSheet
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="How this was made"
      >
        <section className="sec" aria-labelledby="ref-made-who">
          <h3 id="ref-made-who">Who wrote it</h3>
          <p>
            <WrittenBy producedBy="model" />
          </p>
          <p className="check">
            <b>14 numbers</b> in the reply. <b>14</b> match a fact below.
          </p>
          <pre className="raw">{'{ "items": [ { "candidateId": "reschedule-a2" } ] }'}</pre>
        </section>
      </DialogSheet>
      <div lang="hi">
        <p>प्रदूषण से बचने के लिए खिड़कियाँ दोपहर में खोलें। स्कूल, विद्यालय, शुद्ध, क्षेत्र, ज्ञान, श्रमिक।</p>
      </div>
    </Part>
  );
}
