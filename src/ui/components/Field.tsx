// A labelled field with its hint and error tied to the control, for inputs, text areas and selects alike.
import { type ReactElement, type ReactNode, useId } from 'react';

/** What the control must carry so the label, hint and error reach assistive technology. */
export interface ControlProps {
  readonly id: string;
  readonly 'aria-describedby'?: string;
  readonly 'aria-invalid'?: true;
}

/** Props of a field. children receives the props to spread on the control, so any control and layout fit. */
export interface FieldProps {
  readonly label: ReactNode;
  readonly children: (control: ControlProps) => ReactNode;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly id?: string;
}

/** Label, control, hint and error. The error is read first; aria-invalid marks the control while it stands. */
export function Field({ label, children, hint, error, id }: FieldProps): ReactElement {
  const own = useId();
  const controlId = id ?? own;
  const hintId = hint === undefined ? null : `${controlId}-hint`;
  const errorId = error === undefined ? null : `${controlId}-error`;
  const describedBy = [errorId, hintId].filter((part) => part !== null).join(' ');
  const control: ControlProps = {
    id: controlId,
    ...(describedBy === '' ? {} : { 'aria-describedby': describedBy }),
    ...(errorId === null ? {} : { 'aria-invalid': true }),
  };
  return (
    <div className="field">
      <label htmlFor={controlId}>{label}</label>
      {children(control)}
      {errorId === null ? null : (
        <p className="hint" id={errorId}>
          <b>{error}</b>
        </p>
      )}
      {hintId === null ? null : (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}
