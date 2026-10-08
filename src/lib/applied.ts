import type { Commit, GitHubClient } from "./github";

const ORIGIN_TRAILER = /\(cherry picked from commit ([0-9a-f]{7,40})\)/g;

/**
 * Works out which commits of `source` already exist in `target`: either because they are reachable
 * from it, or because a commit in the target records them as its cherry-pick origin.
 */
export async function findAppliedCommits(
  gh: GitHubClient,
  owner: string,
  repo: string,
  source: string,
  target: string,
  sourceCommits: Commit[],
): Promise<Set<string>> {
  if (source === target) return new Set(sourceCommits.map((c) => c.sha));

  const [missing, targetCommits] = await Promise.all([
    gh.compare(owner, repo, target, source),
    gh.listCommits(owner, repo, target, 1, 100),
  ]);

  const notInTarget = new Set(missing.commits.map((c) => c.sha));
  const pickedOrigins = new Set(targetCommits.flatMap((c) => [...c.message.matchAll(ORIGIN_TRAILER)].map((m) => m[1])));

  const applied = new Set<string>();
  for (const commit of sourceCommits) {
    const reachable = missing.isComplete && !notInTarget.has(commit.sha);
    const picked = [...pickedOrigins].some((origin) => commit.sha.startsWith(origin));
    if (reachable || picked) applied.add(commit.sha);
  }
  return applied;
}
