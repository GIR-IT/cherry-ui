# Cherry

Cherry-pick commits on GitHub from the browser, at [cherry-ui.com](https://cherry-ui.com).

Replace `github.com` with `cherry-ui.com` in a repository or compare URL:

```
github.com/org/repo/compare/release...main
cherry-ui.com/org/repo/compare/release...main
```

Pick commits from the source branch, check their diffs, and apply them to the target branch as a pull request or a direct push. `compare/A...B` uses `B` as the source and `A` as the target. `/org/repo?from=main&to=release` works as well.

## How it works

The app is static and runs on Cloudflare Workers. The browser calls `api.github.com` directly, with a personal access token stored in `localStorage`. The token needs Contents and Pull requests write access.

GitHub's API has no cherry-pick endpoint, so Cherry builds one from the merge endpoint. For a commit `C` with parent `P`, it creates a temporary commit that has the target's tree and `P` as its parent, then asks GitHub to merge `C` into it. The merge base is `P`, so the result is the target plus the changes in `C`. Cherry commits that tree on top of the target with the original message and author. Merge commits are applied against their first parent, the same as `git cherry-pick -m 1`. The target branch is only updated after every commit has applied. See `src/lib/cherryPick.ts`.

A commit is marked as already in the target when it is reachable from the target, or when a commit on the target has its `(cherry picked from commit ...)` line.

Diffs are rendered with [`@pierre/diffs`](https://diffs.com). Security headers are in `public/_headers`.

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm run lint
npm run typecheck
npm test             # cherry-pick flow against a fake GitHub API
npm run build && npm run preview
```

In the app, `j` and `k` move between commits, `x` queues one, and shift-click selects a range.

## Deploy

```bash
npx wrangler login
npm run deploy
```

This deploys the `cherry-ui` Worker with `cherry-ui.com` and `www.cherry-ui.com` as custom domains. The domain has to be in the Cloudflare account Wrangler is logged in to.

## Limitations

- Source and target have to be branches of the same repository.
- Conflicts can't be resolved in the browser. When one happens nothing is changed; remove that commit from the queue or pick it locally.

## License

[WTFPL](LICENSE).
