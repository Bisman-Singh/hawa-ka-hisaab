// The band glyph, the band name with its glyph, and the six-step scale with a sentence for screen readers.
// Hatch density tells the band in black and white; the CPCB colour appears once, as a chip over today's cell.
import { useRef } from 'react';
import type { ReactElement } from 'react';
import type { AqiBand } from '../../features/naqi/types.js';
import { BAND_ORDER, BANDS, rangeText, scalePosition } from '../bands.js';
import { useCssVars } from '../hooks/useCssVars.js';
import { BAND_TEXT, scaleSentence } from '../i18n/strings.js';

/** The hatched square of a band. Decorative: the band's name always sits beside it. */
export function BandGlyph({ band }: { readonly band: AqiBand }): ReactElement {
  return <span className={`glyph ${BANDS[band].hatch}`} aria-hidden="true" />;
}

/** The band's name with its glyph, such as the glyph followed by "Very Poor". */
export function BandLabel({ band }: { readonly band: AqiBand }): ReactElement {
  return (
    <span className="band">
      <BandGlyph band={band} />
      {BAND_TEXT[band].name}
    </span>
  );
}

/** Props of the scale: the AQI and the band CPCB gave it. */
export interface BandScaleProps {
  readonly value: number;
  readonly band: AqiBand;
}

/** Six cells with today's marked. Screen readers hear one sentence; the drawing is hidden from them. */
export function BandScale({ value, band }: BandScaleProps): ReactElement {
  const pointer = useRef<HTMLSpanElement>(null);
  useCssVars(pointer, { '--at': scalePosition(value, band).toFixed(3) });
  return (
    <div className="scale">
      <p className="vh">{scaleSentence(value, band, rangeText(band))}</p>
      <span ref={pointer} className="scale-pointer" aria-hidden="true">
        {value}
      </span>
      <ol aria-hidden="true">
        {BAND_ORDER.map((step) => (
          <li key={step} className={step === band ? 'today' : undefined}>
            <span className={step === band ? `chip c-${step}` : 'chip'} />
            <span className={`cell ${BANDS[step].hatch}`} />
            <span className="lo">{BANDS[step].lo}</span>
            <span className="nm">{BAND_TEXT[step].name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
