// The home block of the household form: cooking fuel, what burns or smokes at home, and each room with its rough
// area and purifier. A purifier's CADR is optional; the plan sizes a purifier only where the numbers are given.
import type { ReactElement } from 'react';
import { Check, Checks } from './checks.js';
import { Choice, TextInput } from './controls.js';
import type { Draft, DraftRoom } from './draft.js';
import { binder, MAX_ROWS, NEW_ROW, replaceAt } from './edits.js';
import { OPTIONS } from './options.js';
import { AddButton, RowTitle, UndoLine } from './rows.js';
import { FORM } from './strings.js';
import type { HouseholdFormState } from './useHouseholdForm.js';

const withRooms = (draft: Draft, rooms: readonly DraftRoom[]): Draft => ({
  ...draft,
  home: { ...draft.home, rooms },
});

function RoomRow({ form, room, index }: { form: HouseholdFormState; room: DraftRoom; index: number }) {
  const { draft, at } = form;
  const path = (...rest: readonly string[]) => at('home', 'rooms', index, ...rest);
  const bind = binder(room, (next) => {
    form.edit(withRooms(draft, replaceAt(draft.home.rooms, index, next)));
  });
  const remove = (): void => {
    const next = withRooms(
      draft,
      draft.home.rooms.filter((_, at) => at !== index),
    );
    form.remove({ block: 'rooms', said: FORM.removed(FORM.room(index + 1)), next, back: path('kind').id });
  };
  return (
    <div className="row-form" role="group" aria-labelledby={path().id}>
      <RowTitle
        id={path().id}
        title={`${FORM.room(index + 1)}, ${OPTIONS.room[room.kind]}`}
        onRemove={remove}
      />
      <div className="grid-2">
        <Choice {...path('kind')} label={FORM.roomKind} options={OPTIONS.room} {...bind('kind')} />
        <TextInput
          {...path('areaSqFt')}
          label={FORM.area}
          hint={FORM.areaHint}
          inputMode="decimal"
          {...bind('area')}
        />
      </div>
      <Check id={path('purifier').id} label={FORM.purifier} {...bind('purifier')} />
      {room.purifier ? (
        <TextInput
          {...path('purifier', 'cadrM3PerHour')}
          label={FORM.cadr}
          hint={FORM.cadrHint}
          inputMode="decimal"
          {...bind('cadr')}
        />
      ) : null}
    </div>
  );
}

/** The home block, with Add a room and the undo line after a removal. */
export function HomeRows({ form }: { readonly form: HouseholdFormState }): ReactElement {
  const { draft, at } = form;
  const { home } = draft;
  const bind = binder(home, (next) => {
    form.edit({ ...draft, home: next });
  });
  const add = (): void => {
    form.add(
      withRooms(draft, [...home.rooms, NEW_ROW.room(draft)]),
      at('home', 'rooms', home.rooms.length, 'kind').id,
    );
  };
  return (
    <fieldset className="form-block">
      <legend>{FORM.home}</legend>
      <div className="row-form">
        <Choice
          {...at('home', 'cookingFuel')}
          label={FORM.cooking}
          options={OPTIONS.cooking}
          {...bind('cookingFuel')}
        />
        <Checks
          {...at('home', 'indoorSources')}
          legend={FORM.sources}
          options={OPTIONS.source}
          {...bind('indoorSources')}
        />
      </div>
      {home.rooms.map((room, index) => (
        <RoomRow key={room.id} form={form} room={room} index={index} />
      ))}
      <UndoLine form={form} block="rooms" />
      <AddButton label={FORM.addRoom} full={home.rooms.length >= MAX_ROWS.rooms} onAdd={add} />
    </fieldset>
  );
}
