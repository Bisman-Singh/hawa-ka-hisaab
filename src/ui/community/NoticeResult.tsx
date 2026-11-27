// The result for a society or school: computed facts with their working, the action list, and the notice in
// English and Hindi with copy buttons for the plain text and a print button that prints only the notices.
import { type ReactElement, useState } from 'react';
import { flushSync } from 'react-dom';
import { noticeToPlainText } from '../../features/community/notice.js';
import type { CommunityKind, NoticeResponse, NoticeText } from '../../features/community/types.js';
import type { Language } from '../../lib/types.js';
import { Button } from '../components/Button.js';
import { Section } from '../components/Section.js';
import { amountText } from '../components/words.js';
import { WrittenBy } from '../components/WrittenBy.js';
import { useAnnounce } from '../hooks/announcer.js';
import { Workings } from '../trace/Working.js';
import { HowMade } from '../trace/HowMade.js';
import { copyText, NoticeCard } from './NoticeCard.js';
import { COMMUNITY } from './words.js';
import { calling } from '../handlers.js';

/** Props of the result: the response and whether it is for a society or a school. */
export interface NoticeResultProps {
  readonly response: NoticeResponse;
  readonly kind: CommunityKind;
}

function Facts({ response, kind }: NoticeResultProps): ReactElement {
  const noun = kind === 'school' ? COMMUNITY.school : COMMUNITY.society;
  return (
    <Section title={`${COMMUNITY.facts} ${noun.toLowerCase()}`}>
      <ul className="facts-list">
        {response.facts.map((fact) => (
          <li key={fact.label}>
            <span>{fact.label}</span>
            <span className="fig">{amountText(fact.value, fact.unit)}</span>
            <div className="cite">
              <Workings workings={[fact]} />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Opens the browser's print dialog; the print stylesheet keeps only the notices. */
export function printPage(): void {
  window.print();
}

function Notices({ response }: { readonly response: NoticeResponse }): ReactElement {
  const announce = useAnnounce();
  const [only, setOnly] = useState<Language | null>(null);
  const { en, hi } = response.notice;
  const print = (language: Language): void => {
    flushSync(() => {
      setOnly(language);
    });
    printPage();
    setOnly(null);
  };
  const copy = (text: NoticeText): void => {
    void copyText(noticeToPlainText(text)).then((done) => {
      announce(done ? COMMUNITY.copied : COMMUNITY.copyFailed);
    });
  };
  return (
    <section className="sec" aria-label={COMMUNITY.notice}>
      <div className="sec-head">
        <h2>{COMMUNITY.notice}</h2>
        <div className="actions">
          <Button look="main" onClick={calling(print, 'en')}>
            {COMMUNITY.print}
          </Button>
          {hi === null ? null : (
            <Button look="main" onClick={calling(print, 'hi')}>
              {COMMUNITY.printHindi}
            </Button>
          )}
          <Button onClick={calling(copy, en)}>{COMMUNITY.copyEnglish}</Button>
          {hi === null ? null : <Button onClick={calling(copy, hi)}>{COMMUNITY.copyHindi}</Button>}
        </div>
      </div>
      <div className="small">
        <WrittenBy producedBy={response.trace.producedBy} /> {COMMUNITY.stampNote} {COMMUNITY.photocopy}{' '}
        <HowMade trace={response.trace} />
      </div>
      <NoticeCard text={en} language="en" label={COMMUNITY.noticeEnglish} skip={only === 'hi'} />
      {hi === null ? (
        <p className="small">{COMMUNITY.noHindi}</p>
      ) : (
        <NoticeCard text={hi} language="hi" label={COMMUNITY.noticeHindi} skip={only === 'en'} />
      )}
    </section>
  );
}

/** Facts, actions and the notice, with the stamp and the sheet that shows how the wording was made. */
export function NoticeResult({ response, kind }: NoticeResultProps): ReactElement {
  return (
    <>
      <Facts response={response} kind={kind} />
      <Section title={COMMUNITY.actions}>
        <ol className="acts">
          {response.actions.map((action) => (
            <li key={action.id}>
              <b>{action.title}.</b> {action.detail}
            </li>
          ))}
        </ol>
      </Section>
      <Notices response={response} />
    </>
  );
}
