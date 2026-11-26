// The "how this was made" opener and its sheet, one tap from any generated output: plan, answer or notice.
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Trace } from '../../lib/types.js';
import { DialogSheet } from '../components/DialogSheet.js';
import { TRACE } from './strings.js';
import { TraceSections } from './TraceSections.js';
import { calling } from '../plan/handlers.js';

/** A link-styled button that opens the sheet for this trace. Closing it returns focus to the button. */
export function HowMade({ trace }: { readonly trace: Trace }): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="linkbtn" type="button" onClick={calling(setOpen, true)}>
        {TRACE.open}
      </button>
      <DialogSheet open={open} onClose={calling(setOpen, false)} title={TRACE.open}>
        {open ? <TraceSections trace={trace} /> : null}
      </DialogSheet>
    </>
  );
}
