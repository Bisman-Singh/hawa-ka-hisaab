// The about-the-data page: each data source with the credit and licence it asks for, the studies behind the
// factors, what is measured and what is modelled, that this is not medical advice, and that samples are made up.
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { dataGovInCredit } from '../../config/facts/air.js';
import { factNumber, factQuote } from '../../config/facts/index.js';
import type { Source } from '../../lib/types.js';
import { Credit, factSource } from '../components/Credit.js';
import { ViewHeading } from '../components/Navigation.js';
import { Part } from './parts.js';
import { citedSources } from './sources.js';
import { ABOUT } from './strings.js';

/** One cited document: its title as a link, its publisher and when it was published. */
export function SourceItem({ source }: { readonly source: Source }): ReactElement {
  return (
    <li>
      <a href={source.url}>{source.title}</a>, {source.publisher}
      {source.published === null ? '.' : `, ${source.published}.`}
    </li>
  );
}

/** The data.gov.in credit as its licence template asks, dated, with the licence linked from the registry. */
export function DataGovCredit({ today }: { readonly today: string }): ReactElement {
  const licence = factSource('credit-data-gov-in');
  return (
    <>
      {ABOUT.dataGovNote} {dataGovInCredit(today)} {ABOUT.licence} <a href={licence.url}>{licence.title}</a>.
    </>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: ReactNode }): ReactElement {
  return (
    <li>
      <b>{label}</b>
      <span>{children}</span>
    </li>
  );
}

function Credits({ today }: { readonly today: string }): ReactElement {
  return (
    <ul className="abstract">
      <Row label={ABOUT.feedLabel}>
        <Credit id="credit-cpcb" /> {ABOUT.feedNote}
      </Row>
      <Row label={ABOUT.dataGovLabel}>
        <DataGovCredit today={today} />
      </Row>
      <Row label={ABOUT.modelLabel}>
        <Credit id="credit-open-meteo" /> <Credit id="credit-cams" />
      </Row>
      <Row label={ABOUT.placesLabel}>
        <Credit id="credit-geonames" />
      </Row>
    </ul>
  );
}

/** The about-the-data page. The data.gov.in credit is dated with the day the page is read. */
export function AboutDataView(): ReactElement {
  const [today] = useState(() => new Date().toISOString());
  return (
    <div className="spread even">
      <div className="page-left">
        <ViewHeading>{ABOUT.title}</ViewHeading>
        <p className="lede">{ABOUT.lede}</p>
        <Part title={ABOUT.sources}>
          <Credits today={today} />
        </Part>
        <Part title={ABOUT.measured}>
          <p>
            {ABOUT.measuredText} {factQuote('naqi-worst-sub-index')}
          </p>
          <p>{ABOUT.modelledText}</p>
          <p>{ABOUT.figuresText}</p>
        </Part>
        <Part title={ABOUT.advice}>
          <p>
            {ABOUT.adviceText} <span className="fig">{factNumber('india-emergency-number').value}</span>.
          </p>
        </Part>
        <Part title={ABOUT.samples}>
          <p>{ABOUT.samplesText}</p>
        </Part>
      </div>
      <div className="page-right">
        <Part title={ABOUT.studies}>
          <p className="small">{ABOUT.studiesNote}</p>
          <ul className="cite">
            {citedSources().map((source) => (
              <SourceItem key={source.url} source={source} />
            ))}
          </ul>
        </Part>
      </div>
    </div>
  );
}
