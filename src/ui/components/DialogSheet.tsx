// The sheet that opens over the page for "how this was made": a native modal dialog labelled by its heading.
// Escape and the Close button shut it, and focus goes back to the control that opened it.
import { useEffect, useId, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { UI } from '../i18n/strings.js';

/** Props of the sheet. The opener keeps open in its own state and sets it false in onClose. */
export interface DialogSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
}

/** A modal sheet: the page behind is inert while it is open. */
export function DialogSheet({ open, onClose, title, children }: DialogSheetProps): ReactElement {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const headingId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element === null || open === element.open) {
      return;
    }
    if (open) {
      opener.current = document.activeElement;
      element.showModal();
    } else {
      element.close();
    }
  }, [open]);
  const onDialogClose = (): void => {
    if (opener.current instanceof HTMLElement) {
      opener.current.focus();
    }
    onClose();
  };
  return (
    <dialog ref={dialog} className="made" aria-labelledby={headingId} onClose={onDialogClose}>
      <div className="made-in">
        <div className="made-top">
          <h2 id={headingId}>{title}</h2>
          <form method="dialog">
            <button className="btn btn-quiet" type="submit">
              {UI.close}
            </button>
          </form>
        </div>
        {children}
      </div>
    </dialog>
  );
}
