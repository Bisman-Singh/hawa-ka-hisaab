// The page's buttons that are not a form's submit: the main style, the quiet one, or a link-styled one in text.
import type { ReactElement, ReactNode } from 'react';

/** Props of a button. label names it for assistive technology when its text alone does not. */
export interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly look?: 'main' | 'quiet' | 'link';
  readonly id?: string | undefined;
  readonly disabled?: boolean;
  readonly describedBy?: string | undefined;
  readonly label?: string;
}

const CLASS = { main: 'btn', quiet: 'btn btn-quiet', link: 'linkbtn' } satisfies Readonly<
  Record<NonNullable<ButtonProps['look']>, string>
>;

/** A button of type button, quiet unless asked otherwise. A disabled one is marked, not switched off, so it keeps focus. */
export function Button({
  children,
  onClick,
  look = 'quiet',
  id,
  disabled,
  describedBy,
  label,
}: ButtonProps): ReactElement {
  return (
    <button
      className={CLASS[look]}
      type="button"
      id={id}
      aria-disabled={disabled === true ? true : undefined}
      aria-describedby={describedBy}
      aria-label={label}
      onClick={disabled === true ? undefined : onClick}
    >
      {children}
    </button>
  );
}
