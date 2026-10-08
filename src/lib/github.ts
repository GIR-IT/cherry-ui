const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Repo {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
  canPush: boolean;
}

export interface Branch {
  name: string;
  sha: string;
  isProtected: boolean;
}

export interface Commit {
  sha: string;
  shortSha: string;
  subject: string;
  message: string;
  authorName: string;
  authorLogin?: string;
  avatarUrl?: string;
  date: string;
  parents: string[];
  htmlUrl: string;
}

export interface Viewer {
  login: string;
  avatarUrl: string;
}

export interface GitCommit {
  sha: string;
  treeSha: string;
  parents: string[];
  message: string;
  author: { name: string; email: string; date: string };
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  accept?: string;
}

/** Thin, typed wrapper over the GitHub REST API. Runs entirely in the browser. */
export class GitHubClient {
  constructor(private readonly token?: string) {}

  get isAuthenticated() {
    return Boolean(this.token);
  }

  // ── Reading ────────────────────────────────────────────────────────────

  async getViewer(): Promise<Viewer> {
    const user = await this.json<{ login: string; avatar_url: string }>("/user");
    return { login: user.login, avatarUrl: user.avatar_url };
  }

  async getRepo(owner: string, repo: string): Promise<Repo> {
    const r = await this.json<RawRepo>(`/repos/${owner}/${repo}`);
    return {
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      defaultBranch: r.default_branch,
      isPrivate: r.private,
      htmlUrl: r.html_url,
      canPush: Boolean(r.permissions?.push),
    };
  }

  async listBranches(owner: string, repo: string, maxPages = 5): Promise<Branch[]> {
    const branches: Branch[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const batch = await this.json<RawBranch[]>(`/repos/${owner}/${repo}/branches?per_page=100&page=${page}`);
      branches.push(...batch.map((b) => ({ name: b.name, sha: b.commit.sha, isProtected: b.protected })));
      if (batch.length < 100) break;
    }
    return branches;
  }

  async listCommits(owner: string, repo: string, ref: string, page = 1, perPage = 100): Promise<Commit[]> {
    const raw = await this.json<RawCommit[]>(
      `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(ref)}&per_page=${perPage}&page=${page}`,
    );
    return raw.map(toCommit);
  }

  /** Commits reachable from `head` but not from `base`, oldest first. */
  async compare(owner: string, repo: string, base: string, head: string, maxPages = 5) {
    const commits: Commit[] = [];
    let aheadBy = 0;
    for (let page = 1; page <= maxPages; page++) {
      const raw = await this.json<RawCompare>(
        `/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?per_page=100&page=${page}`,
      );
      aheadBy = raw.ahead_by;
      commits.push(...raw.commits.map(toCommit));
      if (raw.commits.length < 100) break;
    }
    return { commits, aheadBy, isComplete: commits.length >= aheadBy };
  }

  /**
   * The changes a cherry-pick of this commit applies, as a unified diff. For merge commits that is
   * the diff against the first parent, which is also what `git cherry-pick -m 1` applies.
   */
  getCommitDiff(owner: string, repo: string, commit: Pick<Commit, "sha" | "parents">): Promise<string> {
    const path =
      commit.parents.length > 1
        ? `/repos/${owner}/${repo}/compare/${commit.parents[0]}...${commit.sha}`
        : `/repos/${owner}/${repo}/commits/${commit.sha}`;
    return this.text(path, "application/vnd.github.diff");
  }

  async getGitCommit(owner: string, repo: string, sha: string): Promise<GitCommit> {
    const c = await this.json<RawGitCommit>(`/repos/${owner}/${repo}/git/commits/${sha}`);
    return toGitCommit(c);
  }

  async getBranchSha(owner: string, repo: string, branch: string): Promise<string> {
    const ref = await this.json<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    return ref.object.sha;
  }

  // ── Writing ────────────────────────────────────────────────────────────

  async createCommit(
    owner: string,
    repo: string,
    commit: { message: string; tree: string; parents: string[]; author?: GitCommit["author"] },
  ): Promise<GitCommit> {
    const c = await this.json<RawGitCommit>(`/repos/${owner}/${repo}/git/commits`, { method: "POST", body: commit });
    return toGitCommit(c);
  }

  createBranch(owner: string, repo: string, branch: string, sha: string) {
    return this.json(`/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: { ref: `refs/heads/${branch}`, sha },
    });
  }

  updateBranch(owner: string, repo: string, branch: string, sha: string, force: boolean) {
    return this.json(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: "PATCH",
      body: { sha, force },
    });
  }

  async deleteBranch(owner: string, repo: string, branch: string) {
    await this.request(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "DELETE" });
  }

  /**
   * Server-side merge of `head` into branch `base`. Returns the merge commit, or `null` when there
   * was nothing to merge. Throws a 409 `GitHubError` on conflicts.
   */
  async merge(owner: string, repo: string, base: string, head: string): Promise<GitCommit | null> {
    const response = await this.request(`/repos/${owner}/${repo}/merges`, {
      method: "POST",
      body: { base, head, commit_message: "cherry: temporary merge" },
    });
    if (response.status === 204) return null;
    // Unlike the git-data endpoints, this returns a REST "commit": parents at the top level,
    // tree, message and author nested under `commit`.
    const raw = (await response.json()) as RawRestCommit;
    return {
      sha: raw.sha,
      treeSha: raw.commit.tree.sha,
      parents: raw.parents.map((p) => p.sha),
      message: raw.commit.message,
      author: raw.commit.author,
    };
  }

  async createPullRequest(
    owner: string,
    repo: string,
    pr: { title: string; body: string; head: string; base: string },
  ): Promise<{ number: number; htmlUrl: string }> {
    const raw = await this.json<{ number: number; html_url: string }>(`/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      body: pr,
    });
    return { number: raw.number, htmlUrl: raw.html_url };
  }

  // ── Plumbing ───────────────────────────────────────────────────────────

  private async json<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(path, options);
    return (await response.json()) as T;
  }

  private async text(path: string, accept: string): Promise<string> {
    const response = await this.request(path, { accept });
    return response.text();
  }

  private async request(path: string, { method = "GET", body, accept }: RequestOptions = {}): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: accept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: method === "GET" ? "no-cache" : undefined,
    });

    if (!response.ok) throw new GitHubError(response.status, await errorMessage(response));
    return response;
  }
}

async function errorMessage(response: Response): Promise<string> {
  if ((response.status === 403 || response.status === 429) && response.headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
    const when = reset ? ` It resets at ${new Date(reset).toLocaleTimeString([], { timeStyle: "short" })}.` : "";
    return `GitHub's rate limit for anonymous requests is used up.${when} Add a token for 5,000 requests an hour.`;
  }
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

// ── Raw API shapes ─────────────────────────────────────────────────────

interface RawRepo {
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  html_url: string;
  permissions?: { push?: boolean };
}

interface RawBranch {
  name: string;
  protected: boolean;
  commit: { sha: string };
}

interface RawCommit {
  sha: string;
  html_url: string;
  parents: { sha: string }[];
  author: { login: string; avatar_url: string } | null;
  commit: { message: string; author: { name: string; date: string } | null };
}

interface RawCompare {
  ahead_by: number;
  commits: RawCommit[];
}

interface RawRestCommit {
  sha: string;
  parents: { sha: string }[];
  commit: { message: string; tree: { sha: string }; author: { name: string; email: string; date: string } };
}

interface RawGitCommit {
  sha: string;
  message: string;
  tree: { sha: string };
  parents: { sha: string }[];
  author: { name: string; email: string; date: string };
}

function toCommit(raw: RawCommit): Commit {
  const message = raw.commit.message;
  return {
    sha: raw.sha,
    shortSha: raw.sha.slice(0, 7),
    subject: message.split("\n", 1)[0],
    message,
    authorName: raw.commit.author?.name ?? raw.author?.login ?? "Unknown",
    authorLogin: raw.author?.login,
    avatarUrl: raw.author?.avatar_url,
    date: raw.commit.author?.date ?? "",
    parents: raw.parents.map((p) => p.sha),
    htmlUrl: raw.html_url,
  };
}

function toGitCommit(raw: RawGitCommit): GitCommit {
  return {
    sha: raw.sha,
    treeSha: raw.tree.sha,
    parents: raw.parents.map((p) => p.sha),
    message: raw.message,
    author: raw.author,
  };
}
