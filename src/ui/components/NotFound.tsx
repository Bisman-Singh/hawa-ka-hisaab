// The view for an address that names no view, with a way back to the first screen.
import type { ReactElement } from 'react';
import { UI } from '../i18n/strings.js';
import { HOME } from '../router.js';
import type { ViewDef } from '../view-types.js';
import { ViewHeading, ViewLink } from './Navigation.js';
import { StateMessage } from './StateMessage.js';

function NotFoundView(): ReactElement {
  return (
    <>
      <ViewHeading>{UI.notFound.title}</ViewHeading>
      <StateMessage tone="status" glyph="start" title={UI.notFound.body} quiet level={2}>
        <p>
          <ViewLink to={HOME}>{UI.notFound.home}</ViewLink>
        </p>
      </StateMessage>
    </>
  );
}

/** Shown when ?view= names no registered view. */
export const NOT_FOUND: ViewDef = { id: 'not-found', title: UI.notFound.title, Component: NotFoundView };
