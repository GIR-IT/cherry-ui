import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Last line of defence: a readable message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto w-full max-w-[560px] px-4 pt-[18vh]">
        <h1 className="text-base font-semibold tracking-[-0.01em]">Something went wrong</h1>
        <p className="mt-1 font-mono text-xs text-ink-2">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 h-7 rounded border border-line-strong px-2.5 font-medium hover:bg-hover"
        >
          Reload
        </button>
      </div>
    );
  }
}
