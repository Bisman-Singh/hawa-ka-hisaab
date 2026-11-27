// Tests for one notice: the opening, numbered action lines and closing in order, the credits with Open-Meteo's as
// a link, and copyText.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { copyText, NoticeCard } from '../../../src/ui/community/NoticeCard.js';
import { noticeResponse } from '../plan/fixtures.js';

describe('NoticeCard', () => {
  it('puts the opening first, one numbered line per action and the closing last', () => {
    const { en } = noticeResponse(0).notice;
    const { container } = render(<NoticeCard text={en} language="en" label="Notice in English" />);
    expect(container.querySelector('.notice-air p')).toHaveTextContent(en.lines[0] ?? '');
    expect(container.querySelectorAll('ol li')).toHaveLength(en.lines.length - 2);
    expect(screen.getByText(en.lines.at(-1) ?? '')).toBeInTheDocument();
    expect(container.querySelector('.src')).toHaveTextContent(/Open-Meteo\.com.*Made with Hawa Ka Hisaab/);
    expect(screen.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toBeInTheDocument();
  });

  it('shows a one line notice as its opening only', () => {
    const { container } = render(
      <NoticeCard text={{ title: 'Notice', lines: ['Only line.'] }} language="en" label="Notice" />,
    );
    expect(container.querySelectorAll('ol li')).toHaveLength(0);
    expect(screen.getAllByText('Only line.')).toHaveLength(1);
  });
});

describe('copyText', () => {
  it('settles true when the clipboard took the text and false when there is no clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await expect(copyText('a')).resolves.toBe(true);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    await expect(copyText('a')).resolves.toBe(false);
  });
});
