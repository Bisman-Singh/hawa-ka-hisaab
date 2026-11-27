// Tests for the page's buttons: never a submit, quiet unless asked, and named and described as given.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../../src/ui/components/Button.js';

describe('Button', () => {
  it('is a quiet button of type button by default and calls back on click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Try again</Button>);
    const button = screen.getByRole('button', { name: 'Try again' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('btn', 'btn-quiet');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('draws the main and link looks and carries its id, name, description and disabled state', () => {
    render(
      <>
        <p id="d">Why</p>
        <Button look="main" id="go" onClick={vi.fn()}>
          Go
        </Button>
        <Button look="link" label="Remove Room 1" describedBy="d" disabled onClick={vi.fn()}>
          Remove
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('class', 'btn');
    const remove = screen.getByRole('button', { name: 'Remove Room 1' });
    expect(remove).toHaveClass('linkbtn');
    expect(remove).toBeDisabled();
    expect(remove).toHaveAccessibleDescription('Why');
  });
});
