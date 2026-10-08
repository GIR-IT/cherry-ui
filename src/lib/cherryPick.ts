import { type Commit, type GitCommit, type GitHubClient, GitHubError } from "./github";

/** Merge commits are applied relative to this parent (git's `-m 1`). */
const MAINLINE_PARENT = 0;

export type DeliveryMode = "pull-request" | "push";

export interface CherryPickRequest {
  owner: string;
  repo: string;
  targetBranch: string;
  /** Commits to apply, oldest first. */
  commits: Commit[];
  recordOrigin: boolean;
  mode: DeliveryMode;
}

export type CherryPickProgress =
  | { stage: "preparing" }
  | { stage: "picking"; index: number; total: number; commit: Commit }
  | { stage: "finishing" };

export interface CherryPickResult {
  branch: string;
  headSha: string;
  applied: Commit[];
  /** Commits whose changes were already present and produced no change. */
  skipped: Commit[];
  pullRequest?: { number: number; htmlUrl: string };
}

export class CherryPickConflictError extends Error {
  constructor(readonly commit: Commit) {
    super(`${commit.shortSha} (${commit.subject}) conflicts with the target branch.`);
  }
}

/**
 * Cherry-picks commits onto a branch using only the GitHub API, without a local clone.
 *
 * For each commit C with parent P, on a scratch branch whose head is H:
 *   1. Create a "sibling" commit with H's tree but P as parent, and point the scratch branch at it.
 *   2. Ask GitHub to merge C into the scratch branch. With merge base P, the result is
 *      H's tree plus exactly C's changes, which is what `git cherry-pick` computes.
 *   3. Commit that tree on top of H with C's message and author, and advance H.
 *
 * Merge commits are picked against their first parent, like `git cherry-pick -m 1`: P is the
 * mainline parent, and since every common ancestor of the sibling goes through P, the merge base is
 * P and the result is H plus everything the merge brought into the mainline.
 *
 * Nothing touches the target branch until every commit applied cleanly.
 */
export async function cherryPick(
  gh: GitHubClient,
  request: CherryPickRequest,
  onProgress: (progress: CherryPickProgress) => void = () => {},
): Promise<CherryPickResult> {
  const { owner, repo, targetBranch, commits } = request;
  onProgress({ stage: "preparing" });

  for (const commit of commits)
    if (commit.parents.length === 0) throw new Error(`${commit.shortSha} is a root commit and has nothing to pick.`);

  let headSha = await gh.getBranchSha(owner, repo, targetBranch);
  let headTree = (await gh.getGitCommit(owner, repo, headSha)).treeSha;

  const workBranch = scratchBranchName(targetBranch, commits, request.mode);
  await gh.createBranch(owner, repo, workBranch, headSha);

  const applied: Commit[] = [];
  const skipped: Commit[] = [];
  let keepWorkBranch = false;

  try {
    for (const [index, commit] of commits.entries()) {
      onProgress({ stage: "picking", index, total: commits.length, commit });

      const original = await gh.getGitCommit(owner, repo, commit.sha);
      const sibling = await gh.createCommit(owner, repo, {
        message: "cherry: temporary sibling",
        tree: headTree,
        parents: [original.parents[MAINLINE_PARENT]],
      });
      await gh.updateBranch(owner, repo, workBranch, sibling.sha, true);

      let merged: GitCommit | null;
      try {
        merged = await gh.merge(owner, repo, workBranch, commit.sha);
      } catch (error) {
        if (error instanceof GitHubError && error.status === 409) throw new CherryPickConflictError(commit);
        throw error;
      }

      if (!merged || merged.treeSha === headTree) {
        skipped.push(commit);
        await gh.updateBranch(owner, repo, workBranch, headSha, true);
        continue;
      }

      const picked = await gh.createCommit(owner, repo, {
        message: request.recordOrigin ? withOrigin(original.message, commit.sha) : original.message,
        tree: merged.treeSha,
        parents: [headSha],
        author: original.author,
      });
      await gh.updateBranch(owner, repo, workBranch, picked.sha, true);

      headSha = picked.sha;
      headTree = picked.treeSha;
      applied.push(commit);
    }

    onProgress({ stage: "finishing" });

    if (applied.length === 0) return { branch: targetBranch, headSha, applied, skipped };

    if (request.mode === "push") {
      // Fast-forward only: fails safely if someone pushed to the target in the meantime.
      await gh.updateBranch(owner, repo, targetBranch, headSha, false);
      return { branch: targetBranch, headSha, applied, skipped };
    }

    const pullRequest = await gh.createPullRequest(owner, repo, {
      title: pullRequestTitle(applied, targetBranch),
      body: pullRequestBody(applied, skipped),
      head: workBranch,
      base: targetBranch,
    });
    keepWorkBranch = true;
    return { branch: workBranch, headSha, applied, skipped, pullRequest };
  } finally {
    if (!keepWorkBranch) await gh.deleteBranch(owner, repo, workBranch).catch(() => {});
  }
}

function withOrigin(message: string, sha: string) {
  return `${message.trimEnd()}\n\n(cherry picked from commit ${sha})`;
}

function scratchBranchName(target: string, commits: Commit[], mode: DeliveryMode) {
  const suffix = `${commits.at(-1)!.shortSha}-${Date.now().toString(36)}`;
  return mode === "pull-request" ? `cherry-pick/${target}/${suffix}` : `cherry-tmp/${suffix}`;
}

function pullRequestTitle(commits: Commit[], target: string) {
  return commits.length === 1
    ? `[${target}] ${commits[0].subject}`
    : `[${target}] Cherry-pick ${commits.length} commits`;
}

function pullRequestBody(applied: Commit[], skipped: Commit[]) {
  const lines = [
    "Cherry-picked with [Cherry](https://cherry-ui.com):",
    "",
    ...applied.map((c) => `- ${c.sha} ${c.subject}`),
  ];
  if (skipped.length > 0)
    lines.push("", "Skipped (already applied):", ...skipped.map((c) => `- ${c.sha} ${c.subject}`));
  return lines.join("\n");
}
