// The when and how of an outing: start, minutes, whether the time can move, and the trip. Fuel and the
// people in the vehicle are asked only for a car, taxi, two wheeler or auto rickshaw.
import type { ReactElement } from 'react';
import { Segmented } from '../components/Segmented.js';
import { Check } from './checks.js';
import { Choice, TextInput } from './controls.js';
import type { DraftActivity, DraftTravel } from './draft.js';
import { binder, VEHICLES, withMode } from './edits.js';
import { OPTIONS } from './options.js';
import { FORM } from './words.js';
import type { FieldAt } from './useHouseholdForm.js';

/** Finds a field of this outing by the rest of its path. */
export type OutingPath = (...rest: readonly string[]) => FieldAt;

const TIMING = [
  { value: 'fixed', label: OPTIONS.timing.fixed },
  { value: 'flexible', label: OPTIONS.timing.flexible },
] satisfies readonly { readonly value: DraftActivity['timing']; readonly label: string }[];

function Trip({
  travel,
  path,
  set,
}: {
  travel: DraftTravel;
  path: OutingPath;
  set: (next: DraftTravel) => void;
}) {
  const bind = binder(travel, set);
  const vehicle = VEHICLES.has(travel.mode);
  const fuel = bind('fuel');
  return (
    <>
      <div className="grid-3">
        <TextInput {...path('travel', 'distanceKm')} label={FORM.km} inputMode="decimal" {...bind('km')} />
        {vehicle ? (
          <Choice
            {...path('travel', 'fuel')}
            label={FORM.fuel}
            options={OPTIONS.fuel}
            value={fuel.value ?? 'unknown'}
            onChange={fuel.onChange}
          />
        ) : null}
        {vehicle ? (
          <TextInput
            {...path('travel', 'occupancy')}
            label={FORM.inIt}
            inputMode="numeric"
            {...bind('people')}
          />
        ) : null}
      </div>
      <Check id={path('travel', 'roundTrip').id} label={FORM.roundTrip} {...bind('roundTrip')} />
    </>
  );
}

/** Props of the outing's time and trip fields. */
export interface TripFieldsProps {
  readonly activity: DraftActivity;
  readonly path: OutingPath;
  readonly set: (next: DraftActivity) => void;
}

/** Start, minutes, whether the time can move, how the trip is made and, with a trip, its distance and vehicle. */
export function TripFields({ activity, path, set }: TripFieldsProps): ReactElement {
  const bind = binder(activity, set);
  const travel = bind('travel');
  return (
    <>
      <div className="grid-2">
        <TextInput {...path('start')} label={FORM.start} type="time" {...bind('start')} />
        <TextInput
          {...path('durationMinutes')}
          label={FORM.minutes}
          inputMode="numeric"
          {...bind('minutes')}
        />
      </div>
      <Segmented legend={FORM.timing} options={TIMING} {...bind('timing')} />
      <Choice
        {...path('travel', 'mode')}
        label={FORM.travel}
        options={OPTIONS.travel}
        value={activity.travel?.mode ?? 'none'}
        onChange={(mode) => {
          travel.onChange(withMode(activity.travel, mode));
        }}
      />
      {activity.travel === null ? null : <Trip travel={activity.travel} path={path} set={travel.onChange} />}
    </>
  );
}
