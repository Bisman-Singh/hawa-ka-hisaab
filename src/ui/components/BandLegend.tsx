// What the six bands mean: a native disclosure around a real table of CPCB's ranges and health statements.
import type { ReactElement } from 'react';
import { BAND_ORDER, rangeText } from '../bands.js';
import { BAND_TEXT, UI } from './words.js';
import { BandLabel } from './Band.js';
import { Disclosure } from './Disclosure.js';

const REPORT =
  'https://cpcb.gov.in/displaypdf.php?id=bmF0aW9uYWwtYWlyLXF1YWxpdHktaW5kZXgvRklOQUwtUkVQT1JUX0FRSV8ucGRm';

/** The band legend, closed until asked for. Each row names the band in words, never by colour alone. */
export function BandLegend(): ReactElement {
  const { band, range, statement } = UI.legend.head;
  return (
    <Disclosure summary={UI.legend.summary}>
      <table className="legend-table">
        <caption className="vh">{UI.legend.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{band}</th>
            <th scope="col">{range}</th>
            <th scope="col">{statement}</th>
          </tr>
        </thead>
        <tbody>
          {BAND_ORDER.map((step) => (
            <tr key={step}>
              <th scope="row">
                <BandLabel band={step} />
              </th>
              <td className="fig">{rangeText(step)}</td>
              <td>{BAND_TEXT[step].statement}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cite">
        {UI.legend.cite} <a href={REPORT}>{UI.legend.link}</a>
      </p>
    </Disclosure>
  );
}
