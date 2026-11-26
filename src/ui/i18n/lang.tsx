// Marks a passage with its language, so Hindi gets lang="hi", the Hindi face and the taller Hindi line height.
import type { ReactElement, ReactNode } from 'react';
import type { Language } from '../../lib/types.js';

/** The lang attribute for text in the given language, to spread on any element: <p {...langOf(language)}>. */
export function langOf(language: Language): { readonly lang: Language } {
  return { lang: language };
}

/** Props of a passage. */
export interface PassageProps {
  readonly language: Language;
  readonly children: ReactNode;
}

/** A block of generated text in its own language, such as a plan written in Hindi. */
export function Passage({ language, children }: PassageProps): ReactElement {
  return <div {...langOf(language)}>{children}</div>;
}
