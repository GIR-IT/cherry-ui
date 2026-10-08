# Cherry

**[cherry-ui.com](https://cherry-ui.com)**: cherry-pick commits on GitHub from your browser: browse a branch, review diffs in a fast virtualized viewer, queue commits, and land them on another branch as a pull request or a direct push.

Swap `github.com` for `cherry-ui.com`:

```
- github.com/org/repo/compare/release...main
+ cherry-ui.com/org/repo/compare/release...main
```

`compare/A...B` opens with `B` as the source and `A` as the target. `/org/repo?from=main&to=release` works too.

## How it works

- **No backend.** A static React app on Cloudflare Workers. The browser talks to `api.github.com` directly.
- **Your token stays local.** A fine-grained PAT (Contents + Pull requests: read & write) lives in `localStorage` and is only sent to GitHub.
- **Cherry-pick without git.** For each commit `C` with parent `P`, Cherry creates a scratch commit with the target's tree and `P` as parent, then asks GitHub to merge `C` into it. That 3-way merge yields exactly *target + C's changes*, which is committed on top of the target with the original message and author. The target branch is only touched once every commit applies cleanly. See `src/lib/cherryPick.ts`.
- **"In target" detection.** A commit counts as applied when it's reachable from the target, or a target commit carries its `(cherry picked from commit …)` trailer.
- **Diffs** are rendered with [`@pierre/diffs`](https://diffs.com) `CodeView`, which is virtualized and syntax highlighted.
- **Strict security headers** (CSP, HSTS, no framing) in `public/_headers`.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # Biome
npm run typecheck
npm run build && npm run preview   # production build with real headers
```

Keyboard: `j`/`k` move, `x` queue, shift-click a checkbox to queue a range.

## Deploy

```bash
npx wrangler login
npm run deploy
```

## Limitations

- Source and target must be branches of the same repository.
- Merge commits can't be picked.
- On a conflict, nothing is changed. Remove that commit from the queue, or pick it locally.
