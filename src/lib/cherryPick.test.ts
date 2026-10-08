import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CherryPickConflictError, type CherryPickRequest, cherryPick } from "./cherryPick";
import { FakeGitHub } from "./fakeGitHub.test-helper";
import { type Commit, GitHubClient } from "./github";

let github: FakeGitHub;
const client = new GitHubClient("test-token");

beforeEach(() => {
  github = new FakeGitHub();
  vi.stubGlobal("fetch", github.fetch);
});

afterEach(() => vi.unstubAllGlobals());

/** The `Commit` the UI would hold for a commit in the fake. */
function commitOf(sha: string): Commit {
  const stored = github.commits.get(sha)!;
  return {
    sha,
    shortSha: sha.slice(0, 7),
    subject: stored.message.split("\n")[0],
    message: stored.message,
    authorName: stored.author.name,
    date: stored.author.date,
    parents: stored.parents,
    htmlUrl: "",
  };
}

function request(commits: string[], overrides: Partial<CherryPickRequest> = {}): CherryPickRequest {
  return {
    owner: "o",
    repo: "r",
    targetBranch: "release",
    commits: commits.map(commitOf),
    recordOrigin: true,
    mode: "pull-request",
    ...overrides,
  };
}

/** main and release share a base; release has its own change to `version.txt`. */
function seed() {
  github.commit("main", { "a.txt": "a", "b.txt": "b", "version.txt": "1.0" }, "base");
  github.refs.set("release", github.refs.get("main")!);
  github.commit("release", { "version.txt": "1.1" }, "release 1.1");
}

describe("cherryPick", () => {
  it("opens a pull request with the picked commits on top of the target", async () => {
    seed();
    const first = github.commit("main", { "a.txt": "a2" }, "Fix a");
    const second = github.commit("main", { "c.txt": "c" }, "Add c\n\nWith a body.");
    const releaseBefore = github.refs.get("release");

    const result = await cherryPick(client, request([first, second]));

    expect(result.applied.map((c) => c.sha)).toEqual([first, second]);
    expect(result.pullRequest?.number).toBe(1);
    expect(github.pulls[0]).toMatchObject({ head: result.branch, base: "release" });
    // The target itself is untouched until the PR is merged.
    expect(github.refs.get("release")).toBe(releaseBefore);

    expect(github.tree(result.branch)).toEqual({ "a.txt": "a2", "b.txt": "b", "c.txt": "c", "version.txt": "1.1" });
    const [top, below] = github.log(result.branch);
    expect(top.message).toBe(`Add c\n\nWith a body.\n\n(cherry picked from commit ${second})`);
    expect(below.message).toBe(`Fix a\n\n(cherry picked from commit ${first})`);
    expect(below.parents).toEqual([releaseBefore]);
  });

  it("pushes straight to the target and cleans up its scratch branch", async () => {
    seed();
    const fix = github.commit("main", { "b.txt": "b2" }, "Fix b");

    const result = await cherryPick(client, request([fix], { mode: "push", recordOrigin: false }));

    expect(result.branch).toBe("release");
    expect(github.tree("release")).toMatchObject({ "b.txt": "b2", "version.txt": "1.1" });
    expect(github.log("release")[0].message).toBe("Fix b");
    expect([...github.refs.keys()].sort()).toEqual(["main", "release"]);
  });

  it("stops on a conflict without changing anything", async () => {
    seed();
    const clash = github.commit("main", { "version.txt": "2.0" }, "Bump to 2.0");
    const before = new Map(github.refs);

    await expect(cherryPick(client, request([clash]))).rejects.toBeInstanceOf(CherryPickConflictError);
    expect(github.refs).toEqual(before);
    expect(github.pulls).toHaveLength(0);
  });

  it("picks a merge commit against its first parent, like git cherry-pick -m 1", async () => {
    seed();
    github.commit("main", { "main-only.txt": "m" }, "Main work");
    github.refs.set("feature", github.refs.get("main")!);
    github.commit("feature", { "a.txt": "a-feature" }, "Feature 1");
    github.commit("feature", { "f.txt": "f" }, "Feature 2");
    const merge = github.mergeBranch("main", "feature", "Merge feature");

    const result = await cherryPick(client, request([merge], { mode: "push" }));

    expect(result.applied).toHaveLength(1);
    // Everything the merge brought in, nothing else from main.
    expect(github.tree("release")).toEqual({ "a.txt": "a-feature", "b.txt": "b", "f.txt": "f", "version.txt": "1.1" });
  });

  it("skips commits whose changes are already on the target", async () => {
    seed();
    const already = github.commit("main", { "version.txt": "1.1" }, "Also bump to 1.1");
    const fresh = github.commit("main", { "d.txt": "d" }, "Add d");

    const result = await cherryPick(client, request([already, fresh], { mode: "push" }));

    expect(result.skipped.map((c) => c.sha)).toEqual([already]);
    expect(result.applied.map((c) => c.sha)).toEqual([fresh]);
    expect(github.log("release")[0].message).toContain("Add d");
    expect(github.log("release")[1].message).toBe("release 1.1");
  });
});
