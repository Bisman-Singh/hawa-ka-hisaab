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

  it('draws the main and link looks and carries its id, name and description', () => {
    render(
      <>
        <p id="d">Why</p>
        <Button look="main" id="go" onClick={vi.fn()}>
          Go
        </Button>
        <Button look="link" label="Remove Room 1" describedBy="d" onClick={vi.fn()}>
          Remove
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('class', 'btn');
    const remove = screen.getByRole('button', { name: 'Remove Room 1' });
    expect(remove).toHaveClass('linkbtn');
    expect(remove).toHaveAccessibleDescription('Why');
  });

  it('marks a disabled button without removing it from the tab order, and ignores a press on it', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Later hour
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Later hour' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    await userEvent.tab();
    expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });

  it('leaves aria-disabled off a button that is enabled', () => {
    render(<Button onClick={vi.fn()}>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).not.toHaveAttribute('aria-disabled');
  });
});
