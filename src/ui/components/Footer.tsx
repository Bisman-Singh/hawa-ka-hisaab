// The footer: where the data comes from, with the credits its licences ask for, and links to footer views.
import type { ReactElement } from 'react';
import { UI } from '../i18n/strings.js';
import type { ViewDef } from '../view-types.js';
import { ViewLink } from './Navigation.js';

/** The colophon. links are the registered views marked for the footer, such as privacy and terms. */
export function Footer({ links }: { readonly links: readonly ViewDef[] }): ReactElement {
  const { credits } = UI;
  return (
    <footer className="colophon">
      <p>
        {credits.cpcb} {credits.meteoBefore}
        <a href="https://open-meteo.com/">{credits.meteoLink}</a>
        {credits.meteoAfter} {credits.geoBefore}
        <a href="https://www.geonames.org/">{credits.geoLink}</a>
        {credits.geoAfter} {credits.samples}
      </p>
      {links.length === 0 ? null : (
        <ul>
          {links.map((view) => (
            <li key={view.id}>
              <ViewLink to={view.id}>{view.title}</ViewLink>
            </li>
          ))}
        </ul>
      )}
    </footer>
  );
}
