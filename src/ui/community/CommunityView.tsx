// The society or school view: the form on one page, and on the other the model choice when none is made yet, then
// the facts, actions and notice once sent.
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Location } from '../../features/air/types.js';
import type { CommunityKind } from '../../features/community/types.js';
import { ViewHeading } from '../components/Navigation.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { ModelChoice } from '../consent/ModelChoice.js';
import { CONSENT } from '../consent/strings.js';
import { Missing } from '../plan/states.js';
import { useAppState } from '../state/app-state.js';
import { CommunityFormView } from './CommunityForm.js';
import { NoticeResult } from './NoticeResult.js';
import { COMMUNITY } from './strings.js';
import { useCommunityNotice } from './useCommunityNotice.js';

/** The community view. It needs a place first, since the notice states today's air there. */
export function CommunityView(): ReactElement {
  const { location } = useAppState();
  return location === null ? (
    <Missing title={COMMUNITY.title} what="no_place" />
  ) : (
    <Community location={location} />
  );
}

function Community({ location }: { readonly location: Location }): ReactElement {
  const [kind, setKind] = useState<CommunityKind>('housing_society');
  const notice = useCommunityNotice(location);
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
            notice.send(community);
          }}
        />
      </div>
      <div className="page-right">
        {notice.choose ? <ModelChoice without={CONSENT.offNotice} onChoose={notice.chosen} /> : null}
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
