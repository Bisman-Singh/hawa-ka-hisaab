// Catches a rendering error in a view and offers a retry instead of a blank page. The frame stays usable.
import { Component } from 'react';
import type { ReactNode } from 'react';
import { UI } from '../i18n/strings.js';
import { StateMessage } from './StateMessage.js';

/** Props of the error boundary. */
export interface ErrorBoundaryProps {
  readonly children?: ReactNode;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

/** Shows a short alert and a retry button when a child view throws while rendering. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <StateMessage tone="alert" glyph="broken" title={UI.broken.title}>
        <p>{UI.broken.body}</p>
        <button
          className="btn btn-quiet"
          type="button"
          onClick={() => {
            this.setState({ failed: false });
          }}
        >
          {UI.retry}
        </button>
      </StateMessage>
    );
  }
}
