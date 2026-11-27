// What the place field shows under itself: the search in progress, a failed search, the list for an ambiguous
// name, and the device location states. Also the words for the field's hint and problem.
import type { ReactElement } from 'react';
import type { Place, PlacesResponse } from '../../features/air/types.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { StateMessage } from '../components/StateMessage.js';
import type { PlaceQuery } from '../data/api.js';
import type { Query } from '../data/request.js';
import { placeLabel } from './place-answer.js';
import { PLACE } from './strings.js';
import type { LocateState } from './useDeviceLocation.js';

const REFUSALS = { denied: PLACE.denied, unavailable: PLACE.unavailable, outside: PLACE.outside };

/** Chooses a place from the list. */
export type Pick = (place: Place) => void;

function Choices({ places, id, pick }: { places: readonly Place[]; id: string; pick: Pick }): ReactElement {
  return (
    <>
      <p className="label" id={`${id}-choose`}>
        {PLACE.choose}
      </p>
      <ul className="abstract" aria-labelledby={`${id}-choose`}>
        {places.map((place, index) => (
          <li key={place.id}>
            <button
              className="linkbtn"
              type="button"
              id={index === 0 ? `${id}-first` : undefined}
              onClick={() => {
                pick(place);
              }}
            >
              {placeLabel(place)}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The search in progress, its failure with a retry, or the list for an ambiguous name. */
export function SearchState(props: {
  query: Query<PlacesResponse>;
  id: string;
  pick: Pick;
}): ReactElement | null {
  const { query, id, pick } = props;
  const { state } = query;
  if (state.status === 'loading') {
    return <p className="status">{PLACE.finding}</p>;
  }
  if (state.status === 'failed') {
    return <RequestFailure failure={state.failure} retry={query.retry} />;
  }
  return state.status === 'done' && state.data.places.length > 1 ? (
    <Choices places={state.data.places} id={id} pick={pick} />
  ) : null;
}

/** The device location request in progress, or why it gave no point. */
export function DeviceState({ state }: { readonly state: LocateState }): ReactElement | null {
  if (state === 'idle') {
    return null;
  }
  if (state === 'asking') {
    return <p className="status">{PLACE.asking}</p>;
  }
  return (
    <StateMessage tone="alert" glyph="location" title={REFUSALS[state].title}>
      <p>{REFUSALS[state].body}</p>
    </StateMessage>
  );
}

/** The hint and problem of the place field: a blank search or a place not found. */
export function fieldWords(
  blank: boolean,
  search: PlaceQuery | null,
  query: Query<PlacesResponse>,
): { readonly error: string | undefined; readonly hint: string } {
  const { state } = query;
  if (blank) {
    return { error: PLACE.blank, hint: PLACE.hint };
  }
  if (search !== null && state.status === 'done' && state.data.places.length === 0) {
    const [error, hint] = PLACE.notFound(search.q);
    return { error, hint };
  }
  return { error: undefined, hint: PLACE.hint };
}

/** The crosshair drawn on the device location button. */
export function Crosshair(): ReactElement {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 1v4M10 15v4M1 10h4M15 10h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
