import { useCallback, useSyncExternalStore } from "react";
import { type RepoRoute, routeFromLocation, routeToPath } from "../lib/route";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

const snapshot = () => window.location.pathname + window.location.search;

/** Minimal router: the URL is `/owner/repo?from=branch&to=branch`. */
export function useRoute() {
  const href = useSyncExternalStore(subscribe, snapshot);
  const route = href === "/" ? null : routeFromLocation(window.location);

  const navigate = useCallback((next: RepoRoute | null, { replace = false } = {}) => {
    const path = next ? routeToPath(next) : "/";
    if (path === snapshot()) return;
    window.history[replace ? "replaceState" : "pushState"](null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return [route, navigate] as const;
}
