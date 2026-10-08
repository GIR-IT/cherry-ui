export interface RepoRoute {
  owner: string;
  repo: string;
  /** Branch commits are picked from. */
  source?: string;
  /** Branch commits land on. */
  target?: string;
}

/**
 * Accepts anything a person might paste: `owner/repo`, a github.com URL, a branch URL, or a compare
 * URL (`/compare/main...feature` means: pick from `feature` into `main`).
 */
export function parseRepoInput(input: string): RepoRoute | null {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?github\.com\//, "")
    .replace(/^[^/]*\.(dev|app|com|workers\.dev)\//, "")
    .replace(/\.git$/, "")
    .replace(/^\/+/, "");

  const [owner, repo, kind, ...rest] = cleaned.split(/[/?#]/);
  if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;

  const route: RepoRoute = { owner, repo };
  const tail = decodeURIComponent(rest.join("/"));

  if (kind === "compare" && tail.includes("...")) {
    const [base, head] = tail.split("...");
    route.target = base || undefined;
    route.source = head || undefined;
  } else if ((kind === "tree" || kind === "commits") && tail) {
    route.source = tail;
  }
  return route;
}

export function routeFromLocation(location: Location): RepoRoute | null {
  const route = parseRepoInput(location.pathname);
  if (!route) return null;
  const params = new URLSearchParams(location.search);
  route.source = params.get("from") ?? route.source;
  route.target = params.get("to") ?? route.target;
  return route;
}

export function routeToPath({ owner, repo, source, target }: RepoRoute): string {
  const params = new URLSearchParams();
  if (source) params.set("from", source);
  if (target) params.set("to", target);
  const query = params.toString();
  return `/${owner}/${repo}${query ? `?${query}` : ""}`;
}
