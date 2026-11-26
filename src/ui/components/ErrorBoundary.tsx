// Catches a rendering error in its children and offers a retry instead of a blank page.
import { Component, type ReactNode } from 'react';

/** Props of the error boundary. */
export interface ErrorBoundaryProps {
  readonly children?: ReactNode;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

/** Shows a short message and a retry button when a child view throws while rendering. */
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
      <div role="alert" className="error-panel">
        <p>This part of the page stopped working.</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ failed: false });
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
