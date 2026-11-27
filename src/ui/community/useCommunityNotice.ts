// The notice for what a society or school sent: from the server with the model on, made in this browser on the air
// it read with the model off, and held until the person chooses when no choice is made yet.
import { useMemo, useState } from 'react';
import type { Location } from '../../features/air/types.js';
import type { CommunityInput, NoticeResponse } from '../../features/community/types.js';
import { useAir } from '../data/api.js';
import { useNotice } from '../data/plan-api.js';
import type { RequestState } from '../data/request.js';
import { useAnnounce } from '../hooks/announcer.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import type { ModelChoiceValue } from '../storage.js';
import { localNotice } from './local.js';
import { COMMUNITY } from './words.js';

interface Sent {
  readonly community: CommunityInput;
  readonly at: number;
}

/** Where the notice stands, whether the choice is still to be made, and how to send, choose and retry. */
export interface CommunityNotice {
  readonly state: RequestState<NoticeResponse>;
  readonly choose: boolean;
  readonly send: (community: CommunityInput) => void;
  readonly chosen: (choice: Exclude<ModelChoiceValue, null>) => void;
  readonly retry: () => void;
}

function localState(
  made: NoticeResponse | null,
  air: RequestState<unknown>,
  sent: Sent | null,
): RequestState<NoticeResponse> {
  if (made !== null) {
    return { status: 'done', data: made };
  }
  if (air.status === 'failed') {
    return air;
  }
  return sent === null ? { status: 'idle' } : { status: 'loading' };
}

/** With the model off: the notice made here once the air for the location is read, and that air request. */
function useLocalNotice(location: Location, sent: Sent | null, local: boolean) {
  const { reading } = useAppState();
  const { setReading } = useAppActions();
  const announce = useAnnounce();
  const air = useAir(local && sent !== null && reading === null ? location : null, (data) => {
    setReading(data);
    announce(COMMUNITY.ready);
  });
  const made = useMemo(
    () => (local && sent !== null && reading !== null ? localNotice(sent.community, reading, sent.at) : null),
    [local, sent, reading],
  );
  return { air, made, ready: reading !== null };
}

/** The notice hook for the community view at a location. */
export function useCommunityNotice(location: Location): CommunityNotice {
  const { modelChoice } = useAppState();
  const announce = useAnnounce();
  const notice = useNotice(() => {
    announce(COMMUNITY.ready);
  });
  const [sent, setSent] = useState<Sent | null>(null);
  const local = modelChoice === 'off';
  const { air, made, ready } = useLocalNotice(location, sent, local);
  const send = (community: CommunityInput): void => {
    setSent({ community, at: Date.now() });
    if (modelChoice === 'on') {
      notice.run({ community, location });
    } else if (local && ready) {
      announce(COMMUNITY.ready);
    }
  };
  const chosen = (choice: Exclude<ModelChoiceValue, null>): void => {
    if (choice === 'on' && sent !== null) {
      notice.run({ community: sent.community, location });
    }
  };
  const state = local ? localState(made, air.state, sent) : notice.state;
  const choose = modelChoice === null && sent !== null;
  return { state, choose, send, chosen, retry: local ? air.retry : notice.retry };
}
