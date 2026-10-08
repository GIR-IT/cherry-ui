import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { findAppliedCommits } from "../lib/applied";
import { type Commit, GitHubClient } from "../lib/github";
import { useLocalStorage } from "./useLocalStorage";

interface GitHubContextValue {
  client: GitHubClient;
  token: string | null;
  setToken(token: string | null): void;
}

const GitHubContext = createContext<GitHubContextValue | null>(null);

/** Owns the personal access token (browser-only, in localStorage) and the API client built from it. */
export function GitHubProvider({ children }: { children: ReactNode }) {
  const [token, setStoredToken] = useLocalStorage<string | null>("cherry.github-token", null);
  const queryClient = useQueryClient();
  const client = useMemo(() => new GitHubClient(token ?? undefined), [token]);

  const value = useMemo<GitHubContextValue>(
    () => ({
      client,
      token,
      setToken(next) {
        setStoredToken(next?.trim() || null);
        queryClient.clear();
      },
    }),
    [client, token, setStoredToken, queryClient],
  );

  return <GitHubContext.Provider value={value}>{children}</GitHubContext.Provider>;
}

export function useGitHub() {
  const context = useContext(GitHubContext);
  if (!context) throw new Error("useGitHub must be used inside <GitHubProvider>");
  return context;
}

// ── Queries ──────────────────────────────────────────────────────────────

export function useViewer() {
  const { client, token } = useGitHub();
  return useQuery({ queryKey: ["viewer", token], queryFn: () => client.getViewer(), enabled: Boolean(token) });
}

export function useRepo(owner: string, repo: string) {
  const { client } = useGitHub();
  return useQuery({ queryKey: ["repo", owner, repo], queryFn: () => client.getRepo(owner, repo) });
}

export function useBranches(owner: string, repo: string) {
  const { client } = useGitHub();
  return useQuery({ queryKey: ["branches", owner, repo], queryFn: () => client.listBranches(owner, repo) });
}

export function useCommits(owner: string, repo: string, ref: string | undefined) {
  const { client } = useGitHub();
  return useInfiniteQuery({
    queryKey: ["commits", owner, repo, ref],
    enabled: Boolean(ref),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => client.listCommits(owner, repo, ref!, pageParam),
    getNextPageParam: (last, pages) => (last.length === 100 ? pages.length + 1 : undefined),
  });
}

export function useAppliedCommits(
  owner: string,
  repo: string,
  source: string | undefined,
  target: string | undefined,
  commits: Commit[],
) {
  const { client } = useGitHub();
  return useQuery({
    queryKey: ["applied", owner, repo, source, target, commits.length, commits[0]?.sha],
    enabled: Boolean(source && target && commits.length > 0),
    queryFn: () => findAppliedCommits(client, owner, repo, source!, target!, commits),
  });
}

export function useCommitDiff(owner: string, repo: string, commit: Commit | undefined) {
  const { client } = useGitHub();
  return useQuery({
    queryKey: ["diff", owner, repo, commit?.sha],
    enabled: Boolean(commit),
    staleTime: Infinity,
    queryFn: () => client.getCommitDiff(owner, repo, commit!),
  });
}
