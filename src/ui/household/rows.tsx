// Parts every block of the household form shares: a row's title with its Remove button, the undo line after a
// removal, and the Add button at the end of a block.
import type { ReactElement } from 'react';
import { FORM } from './strings.js';
import type { HouseholdFormState, Removal } from './useHouseholdForm.js';

/** Props of a row title. id names the row's group; the Remove button says what it removes. */
export interface RowTitleProps {
  readonly id: string;
  readonly title: string;
  readonly onRemove: () => void;
}

/** The title of a row and its Remove button. */
export function RowTitle({ id, title, onRemove }: RowTitleProps): ReactElement {
  return (
    <p className="row-title">
      <span id={id}>{title}</span>
      <button className="linkbtn" type="button" aria-label={`${FORM.remove} ${title}`} onClick={onRemove}>
        {FORM.remove}
      </button>
    </p>
  );
}

/** The line after a removal in a block, with an Undo button that takes focus. */
export function UndoLine({
  form,
  block,
}: {
  form: HouseholdFormState;
  block: Removal['block'];
}): ReactElement | null {
  const gone = form.removed;
  if (gone?.block !== block) {
    return null;
  }
  return (
    <p className="status">
      {gone.said}
      <button
        className="linkbtn"
        type="button"
        id={form.ids.undo}
        onClick={() => {
          form.restore(gone);
        }}
      >
        {FORM.undo}
      </button>
    </p>
  );
}

/** Props of an Add button. full disables it once the schema's most rows are there. */
export interface AddButtonProps {
  readonly label: string;
  readonly full: boolean;
  readonly onAdd: () => void;
  readonly id?: string;
  readonly describedBy?: string | undefined;
}

/** The Add button at the end of a block. */
export function AddButton({ label, full, onAdd, id, describedBy }: AddButtonProps): ReactElement {
  return (
    <button
      className="btn btn-quiet"
      type="button"
      id={id}
      aria-describedby={describedBy}
      disabled={full}
      onClick={onAdd}
    >
      {label}
    </button>
  );
}
