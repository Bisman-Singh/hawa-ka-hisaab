// The first screen: the lead line, the place field and, once a place is set, the air card, which loads on demand.
// Beside them, the household intake. A chosen place moves focus to the air card, and its reading is announced.
import { type ReactElement, useCallback, useId } from 'react';
import type { Location, Place } from '../../features/air/types.js';
import { ViewHeading, ViewLede } from '../components/Navigation.js';
import { StateMessage } from '../components/StateMessage.js';
import { useAir } from '../data/api.js';
import { useAnnounce } from '../hooks/announcer.js';
import { IntakeBox } from '../household/IntakeBox.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { airSummary } from './air-summary.js';
import { AirCardSlot } from './AirCardSlot.js';
import { useFocusLater } from '../hooks/focus.js';
import { placeNote, placeWhere } from './place-answer.js';
import { PlaceSearch } from './PlaceSearch.js';
import { AIR, PLACE } from './words.js';

/** The home view: place and air on the left page, the household intake on the right. */
export function HomeView(): ReactElement {
  const id = useId();
  const { location, place } = useAppState();
  const { save, setReading } = useAppActions();
  const announce = useAnnounce();
  const focusLater = useFocusLater();
  const where = placeWhere(place);
  const note = place === null ? PLACE.rounded : placeNote(place);
  const air = useAir(location, (data) => {
    setReading(data);
    announce(airSummary(data));
  });
  const choose = useCallback(
    (next: Place | null, at: Location) => {
      save({ place: next, location: at });
      focusLater(`${id}-air`);
    },
    [save, focusLater, id],
  );
  return (
    <div className="spread">
      <div className="page-left">
        <ViewHeading hidden>{PLACE.title}</ViewHeading>
        <ViewLede>{PLACE.lede}</ViewLede>
        <PlaceSearch onChoose={choose} />
        <section className="sec" aria-labelledby={`${id}-air`}>
          <div className="sec-head">
            <h2 id={`${id}-air`} tabIndex={-1}>
              {AIR.heading}
            </h2>
            {location === null ? null : <span className="small">{where}</span>}
          </div>
          {location === null ? (
            <StateMessage tone="status" glyph="start" title={AIR.start.title} quiet>
              <p>{AIR.start.body}</p>
            </StateMessage>
          ) : (
            <>
              {note === null ? null : <p className="hint place-note">{note}</p>}
              <AirCardSlot air={air} where={where} />
            </>
          )}
        </section>
      </div>
      <div className="page-right">
        <IntakeBox />
      </div>
    </div>
  );
}
