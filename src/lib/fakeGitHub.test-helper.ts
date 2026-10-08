/**
 * An in-memory GitHub that answers the REST endpoints Cherry writes to, with the response shapes
 * GitHub documents for each one. Trees are flat `path → content` maps and merges are real 3-way
 * merges at file granularity, which is enough to exercise the whole cherry-pick flow.
 */

type Tree = Record<string, string>;

interface StoredCommit {
  sha: string;
  tree: Tree;
  treeSha: string;
  parents: string[];
  message: string;
  author: { name: string; email: string; date: string };
}

const AUTHOR = { name: "Ada", email: "ada@example.com", date: "2026-10-01T12:00:00Z" };

export class FakeGitHub {
  readonly commits = new Map<string, StoredCommit>();
  readonly refs = new Map<string, string>();
  readonly trees = new Map<string, Tree>();
  readonly pulls: { number: number; head: string; base: string; title: string; body: string }[] = [];
  private counter = 0;

  /** Creates a commit on `branch` (or a root commit) applying `changes` to the parent's tree. */
  commit(branch: string | null, changes: Tree, message: string, parents?: string[]): string {
    const parentShas = parents ?? (branch && this.refs.has(branch) ? [this.refs.get(branch)!] : []);
    const base = parentShas[0] ? this.commits.get(parentShas[0])!.tree : {};
    const sha = this.store({ ...base, ...changes }, parentShas, message, AUTHOR);
    if (branch) this.refs.set(branch, sha);
    return sha;
  }

  /** A merge commit of `other` into `branch` (clean merges only). */
  mergeBranch(branch: string, other: string, message: string): string {
    const ours = this.refs.get(branch)!;
    const theirs = this.refs.get(other)!;
    const tree = this.threeWay(this.mergeBase(ours, theirs), ours, theirs);
    if (!tree) throw new Error("fixture merge conflicted");
    const sha = this.store(tree, [ours, theirs], message, AUTHOR);
    this.refs.set(branch, sha);
    return sha;
  }

  tree(branch: string): Tree {
    return this.commits.get(this.refs.get(branch)!)!.tree;
  }

  log(branch: string): StoredCommit[] {
    const out: StoredCommit[] = [];
    let sha: string | undefined = this.refs.get(branch);
    while (sha) {
      const commit = this.commits.get(sha)!;
      out.push(commit);
      sha = commit.parents[0];
    }
    return out;
  }

  /** A `fetch` that serves the fake, for `vi.stubGlobal("fetch", github.fetch)`. */
  fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const path = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, "");

    const readRef = capture(path, /^\/git\/ref\/heads\/(.+)$/);
    const writeRef = capture(path, /^\/git\/refs\/heads\/(.+)$/);
    const commitSha = capture(path, /^\/git\/commits\/(\w+)$/);

    // GET /git/ref/heads/{branch}
    if (method === "GET" && readRef) {
      const sha = this.refs.get(readRef);
      return sha ? json({ ref: `refs/heads/${readRef}`, object: { sha, type: "commit" } }) : notFound();
    }

    // GET /git/commits/{sha}: git-data commit (flat)
    if (method === "GET" && commitSha) {
      const commit = this.commits.get(commitSha);
      return commit ? json(gitDataCommit(commit)) : notFound();
    }

    // POST /git/commits
    if (method === "POST" && path === "/git/commits") {
      const tree = this.trees.get(body.tree);
      if (!tree) return error(422, "Tree SHA does not exist");
      const sha = this.store(tree, body.parents, body.message, body.author ?? AUTHOR);
      return json(gitDataCommit(this.commits.get(sha)!), 201);
    }

    // POST /git/refs
    if (method === "POST" && path === "/git/refs") {
      const name = body.ref.replace(/^refs\/heads\//, "");
      if (this.refs.has(name)) return error(422, "Reference already exists");
      this.refs.set(name, body.sha);
      return json({ ref: body.ref, object: { sha: body.sha, type: "commit" } }, 201);
    }

    // PATCH /git/refs/heads/{branch}
    if (method === "PATCH" && writeRef) {
      const name = writeRef;
      const current = this.refs.get(name);
      if (!current) return notFound();
      if (!body.force && !this.isAncestor(current, body.sha)) return error(422, "Update is not a fast forward");
      this.refs.set(name, body.sha);
      return json({ ref: `refs/heads/${name}`, object: { sha: body.sha, type: "commit" } });
    }

    // DELETE /git/refs/heads/{branch}
    if (method === "DELETE" && writeRef) {
      return this.refs.delete(writeRef) ? new Response(null, { status: 204 }) : notFound();
    }

    // POST /merges: answers with a REST commit (parents top-level, data under `commit`)
    if (method === "POST" && path === "/merges") {
      const ours = this.refs.get(body.base);
      const theirs = this.commits.has(body.head) ? body.head : this.refs.get(body.head);
      if (!ours || !theirs) return notFound();
      if (this.isAncestor(theirs, ours)) return new Response(null, { status: 204 });
      const tree = this.threeWay(this.mergeBase(ours, theirs), ours, theirs);
      if (!tree) return error(409, "Merge conflict");
      const sha = this.store(tree, [ours, theirs], body.commit_message, AUTHOR);
      this.refs.set(body.base, sha);
      return json(restCommit(this.commits.get(sha)!), 201);
    }

    // POST /pulls
    if (method === "POST" && path === "/pulls") {
      const number = this.pulls.length + 1;
      this.pulls.push({ number, head: body.head, base: body.base, title: body.title, body: body.body });
      return json({ number, html_url: `https://github.com/o/r/pull/${number}` }, 201);
    }

    return error(404, `Fake GitHub has no route for ${method} ${url.pathname}`);
  };

  private store(tree: Tree, parents: string[], message: string, author: StoredCommit["author"]): string {
    const treeSha = this.treeSha(tree);
    const sha = (++this.counter).toString(16).padStart(40, "c");
    this.commits.set(sha, { sha, tree, treeSha, parents, message, author });
    return sha;
  }

  private treeSha(tree: Tree): string {
    const key = JSON.stringify(Object.entries(tree).sort());
    for (const [sha, existing] of this.trees) if (JSON.stringify(Object.entries(existing).sort()) === key) return sha;
    const sha = (this.trees.size + 1).toString(16).padStart(40, "t");
    this.trees.set(sha, tree);
    return sha;
  }

  private ancestors(sha: string): Set<string> {
    const seen = new Set<string>();
    const stack = [sha];
    while (stack.length) {
      const next = stack.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(...this.commits.get(next)!.parents);
    }
    return seen;
  }

  private isAncestor(ancestor: string, of: string) {
    return this.ancestors(of).has(ancestor);
  }

  /** The common ancestor that is not an ancestor of any other common ancestor. */
  private mergeBase(a: string, b: string): string | undefined {
    const ofB = this.ancestors(b);
    const common = [...this.ancestors(a)].filter((sha) => ofB.has(sha));
    return common.find(
      (candidate) => !common.some((other) => other !== candidate && this.isAncestor(candidate, other)),
    );
  }

  /** File-level 3-way merge; `null` on conflict. */
  private threeWay(base: string | undefined, ours: string, theirs: string): Tree | null {
    const b = base ? this.commits.get(base)!.tree : {};
    const o = this.commits.get(ours)!.tree;
    const t = this.commits.get(theirs)!.tree;
    const result: Tree = {};
    for (const path of new Set([...Object.keys(b), ...Object.keys(o), ...Object.keys(t)])) {
      const [bv, ov, tv] = [b[path], o[path], t[path]];
      const merged = ov === tv ? ov : ov === bv ? tv : tv === bv ? ov : Symbol.for("conflict");
      if (merged === Symbol.for("conflict")) return null;
      if (merged !== undefined) result[path] = merged as string;
    }
    return result;
  }
}

/** The first capture group of `pattern` in `path`, URL-decoded. */
function capture(path: string, pattern: RegExp): string | undefined {
  const match = path.match(pattern);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function gitDataCommit(commit: StoredCommit) {
  return {
    sha: commit.sha,
    message: commit.message,
    tree: { sha: commit.treeSha },
    parents: commit.parents.map((sha) => ({ sha })),
    author: commit.author,
  };
}

function restCommit(commit: StoredCommit) {
  return {
    sha: commit.sha,
    commit: { message: commit.message, tree: { sha: commit.treeSha }, author: commit.author },
    parents: commit.parents.map((sha) => ({ sha })),
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function error(status: number, message: string) {
  return json({ message }, status);
}

function notFound() {
  return error(404, "Not Found");
}
