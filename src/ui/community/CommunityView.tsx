// The society or school view: the form on one page, and the facts, actions and notice on the other once sent.
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { CommunityKind } from '../../features/community/types.js';
import { ViewHeading } from '../components/Navigation.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { useAction } from '../data/request.js';
import { useAnnounce } from '../hooks/announcer.js';
import { noticeCall } from '../plan/calls.js';
import { Missing } from '../plan/states.js';
import { useAppState } from '../state/app-state.js';
import { CommunityFormView } from './CommunityForm.js';
import { NoticeResult } from './NoticeResult.js';
import { COMMUNITY } from './strings.js';
import { calling } from '../plan/handlers.js';

/** The community view. It needs a place first, since the notice states today's air there. */
export function CommunityView(): ReactElement {
  const { location } = useAppState();
  const announce = useAnnounce();
  const [kind, setKind] = useState<CommunityKind>('housing_society');
  const notice = useAction(noticeCall, calling(announce, COMMUNITY.ready));
  if (location === null) {
    return <Missing title={COMMUNITY.title} what="no_place" />;
  }
  const { state } = notice;
  return (
    <div className="spread">
      <div className="page-left">
        <ViewHeading>{COMMUNITY.title}</ViewHeading>
        <p className="small">{COMMUNITY.intro}</p>
        <CommunityFormView
          busy={state.status === 'loading'}
          onSend={(community) => {
            setKind(community.kind);
            notice.run({ community, location });
          }}
        />
      </div>
      <div className="page-right">
        {state.status === 'loading' ? (
          <p className="status" role="status">
            {COMMUNITY.busy}
          </p>
        ) : null}
        {state.status === 'failed' ? (
          <RequestFailure failure={state.failure} retry={notice.retry} level={2} />
        ) : null}
        {state.status === 'done' ? <NoticeResult response={state.data} kind={kind} /> : null}
      </div>
    </div>
  );
}
