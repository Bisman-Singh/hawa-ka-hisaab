// Tests for the band parts: the glyph is decorative, the name is always written, the scale speaks one sentence.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BandGlyph, BandLabel, BandScale } from '../../../src/ui/components/Band.js';
import { axeViolations } from '../helpers.js';

describe('band parts', () => {
  it('writes the band name beside a hidden hatched glyph', () => {
    render(<BandLabel band="very_poor" />);
    const label = screen.getByText('Very Poor');
    expect(label).toHaveClass('band');
    expect(label.querySelector('.glyph')).toHaveClass('g-vpoor');
    expect(label.querySelector('.glyph')).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws the glyph alone for places where the name sits elsewhere', () => {
    const { container } = render(<BandGlyph band="severe" />);
    expect(container.firstElementChild).toHaveClass('glyph', 'g-severe');
  });

  it('marks today on the scale, places the pointer and gives screen readers one sentence', async () => {
    const { container } = render(<BandScale value={342} band="very_poor" label="CPCB AQI" />);
    expect(screen.getByText('CPCB AQI 342 is in the fifth of six bands, Very Poor, 301 to 400.')).toHaveClass(
      'vh',
    );
    const pointer = container.querySelector<HTMLElement>('.scale-pointer');
    expect(pointer?.style.getPropertyValue('--at')).toBe('0.735');
    expect(pointer).toHaveAttribute('aria-hidden', 'true');
    const cells = container.querySelectorAll('ol li');
    expect(cells).toHaveLength(6);
    expect(container.querySelector('li.today .chip')).toHaveClass('c-very_poor');
    expect(container.querySelectorAll('.chip[class*="c-"]')).toHaveLength(1);
    expect(container.querySelector('ol')).toHaveAttribute('aria-hidden', 'true');
    expect(await axeViolations(container)).toEqual([]);
  });
});
