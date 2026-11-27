// The place field: search by city, town or PIN code, a short list when a name is ambiguous, and device location
// on request. One match is chosen at once; focus moves to the list, the field or the air card as the answer needs.
import { useCallback, useId, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import type { Location, Place, PlacesResponse } from '../../features/air/types.js';
import { Field } from '../components/Field.js';
import { usePlaces } from '../data/api.js';
import type { PlaceQuery } from '../data/api.js';
import { useAnnounce } from '../hooks/announcer.js';
import { useFocusLater } from './focus.js';
import { Crosshair, DeviceState, fieldWords, SearchState } from './place-states.js';
import { PLACE } from './strings.js';
import { useDeviceLocation } from './useDeviceLocation.js';

/** Props of the place field. onChoose gets a found place, or null for the device, with the point to read. */
export interface PlaceSearchProps {
  readonly onChoose: (place: Place | null, at: Location) => void;
}

function useSearch(onChoose: PlaceSearchProps['onChoose'], id: string) {
  const [search, setSearch] = useState<PlaceQuery | null>(null);
  const announce = useAnnounce();
  const focusLater = useFocusLater();
  const pick = useCallback(
    (place: Place) => {
      setSearch(null);
      onChoose(place, { lat: place.lat, lon: place.lon });
    },
    [onChoose],
  );
  const onFound = ({ places }: PlacesResponse): void => {
    const [first, second] = places;
    if (first && !second) {
      pick(first);
      return;
    }
    if (first) {
      announce(`${String(places.length)} places match. Choose one.`);
    }
    focusLater(first ? `${id}-first` : id);
  };
  const query = usePlaces(search, onFound);
  const run = (q: string): void => {
    setSearch({ q, turn: (search?.turn ?? 0) + 1 });
    announce(PLACE.finding);
  };
  const located = useCallback(
    (at: Location) => {
      onChoose(null, at);
    },
    [onChoose],
  );
  return { search, query, pick, run, focusLater, device: useDeviceLocation(located) };
}

interface PlaceInputProps {
  readonly id: string;
  readonly words: ReturnType<typeof fieldWords>;
  readonly text: string;
  readonly onText: (text: string) => void;
}

function PlaceInput({ id, words, text, onText }: PlaceInputProps): ReactElement {
  return (
    <Field id={id} label={PLACE.label} hint={words.hint} error={words.error}>
      {(control) => (
        <div className="place-row">
          <input
            {...control}
            className="input"
            value={text}
            maxLength={80}
            inputMode="text"
            autoComplete="address-level2"
            onChange={(event) => {
              onText(event.target.value);
            }}
          />
          <button className="btn" type="submit">
            {PLACE.find}
          </button>
        </div>
      )}
    </Field>
  );
}

/** The place form with its search results and device location states. */
export function PlaceSearch({ onChoose }: PlaceSearchProps): ReactElement {
  const id = useId();
  const [text, setText] = useState('');
  const [blank, setBlank] = useState(false);
  const { search, query, pick, run, focusLater, device } = useSearch(onChoose, id);
  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const q = text.trim();
    setBlank(q === '');
    if (q === '') {
      focusLater(id);
      return;
    }
    run(q);
  };
  return (
    <section className="sec" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="vh">
        {PLACE.heading}
      </h2>
      <DeviceState state={device.state} />
      <form className="place" onSubmit={submit} noValidate>
        <PlaceInput id={id} words={fieldWords(blank, search, query)} text={text} onText={setText} />
        <button className="btn btn-quiet" type="button" onClick={device.locate}>
          <Crosshair />
          {PLACE.locate}
        </button>
      </form>
      <SearchState query={query} id={id} pick={pick} />
    </section>
  );
}
