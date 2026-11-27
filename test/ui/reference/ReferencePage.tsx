// The component reference: every shared component in every state, with sample values, for development only.
// It runs on the dev server at /test/ui/reference/ and never enters the production build.
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Field } from '../../../src/ui/components/Field.js';
import { BandGlyph, BandLabel, BandScale } from '../../../src/ui/components/Band.js';
import { BandLegend } from '../../../src/ui/components/BandLegend.js';
import { ViewHeading, ViewLink } from '../../../src/ui/components/Navigation.js';
import { Segmented } from '../../../src/ui/components/Segmented.js';
import { BAND_ORDER } from '../../../src/ui/bands.js';
import { useAnnounce } from '../../../src/ui/hooks/announcer.js';
import type { ViewDef } from '../../../src/ui/view-types.js';
import { Ledger, Part, Sheet, States } from './parts.js';

function Crosshair(): ReactElement {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M15.5 10a5.5 5.5 0 1 1-11 0a5.5 5.5 0 1 1 11 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M10 1v4M10 15v4M1 10h4M15 10h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Controls(): ReactElement {
  const [ride, setRide] = useState<'auto' | 'cycle'>('auto');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const announce = useAnnounce();
  return (
    <Part id="ref-controls" title="Buttons, links and fields">
      <div className="actions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            announce('Sample announcement in the live region.');
          }}
        >
          Read my household
        </button>
        <button className="btn btn-quiet" type="button">
          <Crosshair />
          Use my location
        </button>
        <button className="btn" type="button" disabled>
          Sending
        </button>
        <button className="linkbtn" type="button">
          Lucknow, Uttar Pradesh
        </button>
        <ViewLink to="plan">A link to another view</ViewLink>
      </div>
      <Field label="City, town or PIN code" hint="Any place in India." id="ref-place">
        {(control) => (
          <div className="place-row">
            <input
              {...control}
              className="input"
              defaultValue="110092"
              inputMode="text"
              autoComplete="address-level2"
            />
            <button className="btn" type="button">
              Find
            </button>
          </div>
        )}
      </Field>
      <Field
        label="City, town or PIN code, with an error"
        hint="Check the spelling, or try a PIN code."
        error="No place in India matches this name."
        id="ref-place-bad"
      >
        {(control) => <input {...control} className="input" defaultValue="Lukhnow" />}
      </Field>
      <Field
        label="Your question"
        hint="Questions about symptoms or medicines get a fixed reply."
        id="ref-question"
      >
        {(control) => <textarea {...control} rows={3} />}
      </Field>
      <Field label="Cooking fuel" id="ref-fuel">
        {(control) => (
          <select {...control} defaultValue="lpg">
            <option value="lpg">LPG</option>
            <option value="wood">Wood</option>
          </select>
        )}
      </Field>
      <Segmented
        legend="What if he goes by"
        name="ref-ride"
        value={ride}
        onChange={setRide}
        options={[
          { value: 'auto', label: 'Shared auto' },
          { value: 'cycle', label: 'Cycle' },
        ]}
      />
      <Segmented
        legend="Plan language"
        name="ref-language"
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'en', label: 'English' },
          { value: 'hi', label: 'हिन्दी', lang: 'hi' },
        ]}
      />
    </Part>
  );
}

function Bands(): ReactElement {
  return (
    <Part id="ref-bands" title="Bands">
      <ul className="abstract">
        {BAND_ORDER.map((band) => (
          <li key={band}>
            <BandLabel band={band} />
          </li>
        ))}
      </ul>
      <div className="slip">
        <BandScale value={342} band="very_poor" label="CPCB AQI" />
        <BandScale value={41} band="good" label="CPCB AQI" />
        <BandScale value={447} band="severe" label="Estimated index" />
        <BandLegend />
      </div>
      <p>
        A glyph on its own, beside a heading that names the band: <BandGlyph band="severe" />
      </p>
    </Part>
  );
}

function Reference(): ReactElement {
  return (
    <>
      <ViewHeading>Component reference</ViewHeading>
      <p className="lede">Every shared component in every state, with sample values. Not real readings.</p>
      <Controls />
      <Bands />
      <States />
      <Ledger />
      <Sheet />
    </>
  );
}

/** The reference as the first view of its own page. */
export const REFERENCE_VIEW: ViewDef = { id: 'home', title: 'Component reference', Component: Reference };
