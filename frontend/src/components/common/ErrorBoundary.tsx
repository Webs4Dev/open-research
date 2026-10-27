import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render crashes in a page so the app shell stays usable instead of
 * going blank. Give it a `key` (e.g. the pathname) to reset it on navigation.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div>
        <h1 className="mb-2 text-xl font-medium">Something went wrong</h1>
        <p className="mb-4 text-sm text-text-secondary">
          This page hit an unexpected error: {this.state.error.message}
        </p>
        <button className="btn-secondary" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
