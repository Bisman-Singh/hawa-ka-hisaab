// Tests for the titled section: it is named by its own heading, at the level asked for, with extra classes kept.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Section } from '../../../src/ui/components/Section.js';

describe('Section', () => {
  it('is a region named by its heading, an h2 by default or an h3 when asked', () => {
    render(
      <>
        <Section title="Kept">
          <p>Nothing.</p>
        </Section>
        <Section title="Inside" level={3} className="ask" />
      </>,
    );
    expect(screen.getByRole('region', { name: 'Kept' })).toHaveClass('sec');
    expect(screen.getByRole('heading', { level: 2, name: 'Kept' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Inside' })).toHaveClass('sec', 'ask');
    expect(screen.getByRole('heading', { level: 3, name: 'Inside' })).toBeInTheDocument();
  });
});
