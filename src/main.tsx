import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ui/Toast";
import { GitHubProvider } from "./hooks/github";
import { GitHubError } from "./lib/github";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // 4xx answers (not found, no access, rate limited) won't change on retry.
      retry: (failures, error) => failures < 2 && !(error instanceof GitHubError && error.status < 500),
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GitHubProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </GitHubProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
