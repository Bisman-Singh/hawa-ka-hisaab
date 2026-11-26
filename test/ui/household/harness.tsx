// A household form block under test: the real form state hook around it, in the app's state and router, with
// the live region, and a way to read the working copy after each change.
import { useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { RenderResult } from '@testing-library/react';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type { Household } from '../../../src/features/household/types.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import type { Draft } from '../../../src/ui/household/draft.js';
import { useHouseholdForm } from '../../../src/ui/household/useHouseholdForm.js';
import type { HouseholdFormState } from '../../../src/ui/household/useHouseholdForm.js';
import { renderInApp } from '../helpers.js';

/** What renderForm gives back: the render, the save spy, and the working copy and state as they stand. */
export interface RenderedForm extends RenderResult {
  readonly onSave: Mock<(household: Household) => void>;
  readonly draft: () => Draft | undefined;
  readonly form: () => HouseholdFormState | null;
}

/** Renders blocks of the form from a starting draft. draft() gives the working copy as it stands. */
export function renderForm(initial: Draft, blocks: (form: HouseholdFormState) => ReactNode): RenderedForm {
  const onSave = vi.fn<(household: Household) => void>();
  const seen: { form: HouseholdFormState | null } = { form: null };
  function Harness(): ReactElement {
    const form = useHouseholdForm(initial, onSave);
    useEffect(() => {
      seen.form = form;
    });
    return (
      <form onSubmit={form.submit} noValidate aria-label="Household">
        {blocks(form)}
        <button type="submit">Check</button>
      </form>
    );
  }
  const view = renderInApp(
    <Announcer>
      <Harness />
    </Announcer>,
  );
  return { ...view, onSave, draft: () => seen.form?.draft, form: () => seen.form };
}

/** The text of the live region. */
export function spoken(): string {
  return document.querySelector('.vh[role="status"]')?.textContent ?? '';
}
