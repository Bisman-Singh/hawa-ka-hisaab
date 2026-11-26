// Tests for the online flag: it follows the browser's online and offline events.
import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useOnline } from '../../../src/ui/hooks/useOnline.js';

function Flag(): ReactElement {
  return <p>{useOnline() ? 'online' : 'offline'}</p>;
}

describe('useOnline', () => {
  it('reads navigator.onLine and updates on the events', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { unmount } = render(<Flag />);
    expect(screen.getByText('online')).toBeInTheDocument();
    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText('offline')).toBeInTheDocument();
    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByText('online')).toBeInTheDocument();
    unmount();
  });
});
