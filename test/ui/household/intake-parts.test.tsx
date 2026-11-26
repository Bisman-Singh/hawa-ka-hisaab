// Tests for the intake parts: the text box with its count and problem, the samples, and the privacy note.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IntakeSamples, IntakeText, PrivacyNote } from '../../../src/ui/household/intake-parts.js';
import { PRIVACY_NOTE } from '../../../src/ui/household/strings.js';

describe('intake parts', () => {
  it('labels the box by its heading and ties the count, hint and problem to it', async () => {
    const onText = vi.fn();
    const { rerender } = render(<IntakeText id="i" text="ab" problem={null} onText={onText} />);
    const box = screen.getByRole('textbox', { name: 'Who is at home and how does your day go?' });
    expect(box).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('2 of 2000 characters.')).toBeInTheDocument();
    await userEvent.type(box, 'c');
    expect(onText).toHaveBeenCalledWith('abc');
    rerender(
      <IntakeText id="i" text="" problem="Write a few words about your household first." onText={onText} />,
    );
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAttribute('aria-describedby', 'i-error i-hint i-count i-privacy');
  });

  it('offers three samples, each described by its own sentence', async () => {
    const onUse = vi.fn<(text: string) => void>();
    render(<IntakeSamples id="s" onUse={onUse} />);
    const buttons = screen.getAllByRole('button', { name: 'Use this' });
    expect(buttons).toHaveLength(3);
    await userEvent.click(buttons[2] ?? document.body);
    expect(onUse.mock.calls[0]?.[0]).toMatch(/delivery rider/);
    expect(buttons[2]).toHaveAccessibleDescription(/delivery rider/);
  });

  it('says where the text goes and asks for no names or health record details', () => {
    render(<PrivacyNote id="p" />);
    expect(screen.getByText(PRIVACY_NOTE.body)).toBeInTheDocument();
    expect(PRIVACY_NOTE.body).toMatch(/Google's Gemini model/);
    expect(PRIVACY_NOTE.body).toMatch(/leave out names and health record details/);
    expect(
      screen.getByText('Nothing is kept on our server. Your household stays in this browser.'),
    ).toBeInTheDocument();
  });
});
