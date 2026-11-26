// Tests for the CSSOM route for dynamic values: custom properties are set without a style attribute in markup.
import { render } from '@testing-library/react';
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { useCssVars } from '../../../src/ui/hooks/useCssVars.js';

function Bar({ value, attach }: { readonly value: number; readonly attach: boolean }): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  useCssVars(ref, { '--v': value, '--at': '0.5' });
  return attach ? <span ref={ref} data-testid="bar" /> : <span data-testid="bar" />;
}

describe('useCssVars', () => {
  it('writes the values through the CSSOM and follows changes', () => {
    const { getByTestId, rerender } = render(<Bar value={120} attach />);
    const bar = getByTestId('bar');
    expect(bar.style.getPropertyValue('--v')).toBe('120');
    expect(bar.style.getPropertyValue('--at')).toBe('0.5');
    rerender(<Bar value={90} attach />);
    expect(bar.style.getPropertyValue('--v')).toBe('90');
  });

  it('does nothing while the element is not attached', () => {
    const { getByTestId } = render(<Bar value={120} attach={false} />);
    expect(getByTestId('bar').style.getPropertyValue('--v')).toBe('');
  });
});
