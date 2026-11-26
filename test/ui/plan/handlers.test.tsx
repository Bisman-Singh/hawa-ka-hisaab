// Tests for the handler builders: one passes a fixed value, the other passes the control's text.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { calling, texting } from '../../../src/ui/plan/handlers.js';

describe('handlers', () => {
  it('calls with the fixed value, and with the text of the control', async () => {
    const fn = vi.fn();
    calling(fn, 3)();
    expect(fn).toHaveBeenCalledWith(3);
    render(<input aria-label="Text" onChange={texting(fn)} />);
    await userEvent.type(screen.getByLabelText('Text'), 'a');
    expect(fn).toHaveBeenLastCalledWith('a');
  });
});
