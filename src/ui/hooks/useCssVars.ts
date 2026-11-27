// Sets CSS custom properties on an element through the CSSOM. The page policy forbids style attributes, so a
// value worked out in code, such as a bar height or a pointer position, reaches the stylesheet this way.
import { type RefObject, useLayoutEffect } from 'react';

/** Custom property values by name, such as { '--at': 0.735 }. */
export type CssVars = Readonly<Record<`--${string}`, string | number>>;

/** Writes the custom properties to the element after every render, before the browser paints. */
export function useCssVars(ref: RefObject<HTMLElement | null>, vars: CssVars): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    for (const [name, value] of Object.entries(vars)) {
      element.style.setProperty(name, String(value));
    }
  });
}
