// Tests for a data credit: the registry's words linked to the registry's source, its licence where it has one, one
// full stop at the end, and nothing for an id the registry does not hold as a quote.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { factQuote, findFact } from '../../../src/config/facts/index.js';
import { Credit, factSource, LICENCES } from '../../../src/ui/components/Credit.js';
import { axeViolations } from '../helpers.js';

describe('Credit', () => {
  it('links the credit line from the registry to its source and adds its licence', async () => {
    const { container } = render(<Credit id="credit-open-meteo" />);
    const words = factQuote('credit-open-meteo');
    expect(screen.getByRole('link', { name: words })).toHaveAttribute(
      'href',
      findFact('credit-open-meteo')?.source.url,
    );
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      LICENCES['credit-open-meteo']?.url,
    );
    expect(container.textContent).toBe(`${words}, CC BY 4.0.`);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('ends a credit that has a full stop of its own with one, and adds no licence where none is held', () => {
    const { container } = render(<Credit id="credit-cpcb" />);
    expect(container.textContent.endsWith('..')).toBe(false);
    expect(container.textContent.endsWith('.')).toBe(true);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('gives the source a fact cites, and throws for an id the registry does not hold', () => {
    expect(factSource('credit-data-gov-in')).toBe(findFact('credit-data-gov-in')?.source);
    expect(() => factSource('no-such-fact')).toThrow('no fact no-such-fact');
  });

  it('names the licence once when the credit line already ends with it', () => {
    const { container } = render(<Credit id="credit-geonames" />);
    expect(container.textContent.match(/CC BY 4\.0/g)).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeInTheDocument();
  });

  it('shows nothing for an id that is not a quoted fact', () => {
    expect(render(<Credit id="grap-stage-order" />).container).toBeEmptyDOMElement();
    expect(render(<Credit id="no-such-fact" />).container).toBeEmptyDOMElement();
  });
});
