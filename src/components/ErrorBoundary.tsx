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
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-zinc-500">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-cherry-600 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-700"
        >
          Reload
        </button>
      </div>
    );
  }
}
