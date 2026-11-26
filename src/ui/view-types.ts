// The shape of a view the frame can show. Types only, so screen folders can import it without pulling in code.
import type { ComponentType } from 'react';

/**
 * One view. id is its address, ?view=<id>, and home is the first screen. title fills the page title.
 * Component may be React.lazy for views that load on demand. footer lists the view in the footer links.
 */
export interface ViewDef {
  readonly id: string;
  readonly title: string;
  readonly Component: ComponentType;
  readonly footer?: boolean;
}
