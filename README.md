# Cherry

Cherry is a browser-based tool for cherry-picking GitHub commits between branches. Review diffs,
select the changes you need, and open a pull request or push them to a target branch without a
local clone.

[Open Cherry](https://cherry-ui.com)

## Features

- Browse and filter commits by message, author, or SHA.
- Review file diffs before selecting changes.
- Queue multiple commits and apply them in chronological order.
- Identify and optionally hide commits already present in the target branch.
- Open a pull request or update the target branch with a fast-forward push.
- Navigate commits with keyboard shortcuts and select ranges with Shift-click.

## Usage

1. Open [cherry-ui.com](https://cherry-ui.com) and enter a GitHub repository or compare URL.
2. Choose the source and target branches.
3. Review the diffs and queue the commits to apply.
4. Add a GitHub token with access to the repository, then choose pull request or direct push.

You can also replace `github.com` with `cherry-ui.com` in a repository or compare URL:

```text
github.com/org/repo/compare/release...main
cherry-ui.com/org/repo/compare/release...main
```

For `compare/A...B`, `B` is the source and `A` is the target. Query parameters are also supported:
`https://cherry-ui.com/org/repo?from=main&to=release`.

Use `j` / `k` or the arrow keys to move between commits, `x` or Space to toggle a commit in the
queue, and Shift-click to select a range.

## Authentication and privacy

Public repositories can be browsed without a token. Private repositories and cherry-picking
require a GitHub personal access token. Use a fine-grained token restricted to the repositories
you need, with **Contents** and **Pull requests** set to read and write. Changes to
`.github/workflows` also require **Workflows** write access.

Cherry calls `api.github.com` directly from the browser. The token is stored in the browser's
`localStorage` and sent only to GitHub's API. Use a trusted browser and remove the token through
the token dialog when finished on a shared device. See the [privacy policy](https://cherry-ui.com/privacy.html)
for details.

## How it works

Cherry uses GitHub's Git data and merge APIs to apply each commit's changes on a temporary branch.
It preserves the original commit message and author, with an optional cherry-pick origin marker.
Merge commits are applied relative to their first parent, equivalent to `git cherry-pick -m 1`.

The target branch is only updated after every selected commit applies successfully. Direct pushes
are fast-forward only; pull-request mode keeps the changes on a separate branch for review.
Commits that produce no changes are skipped. The implementation is in
[`src/lib/cherryPick.ts`](src/lib/cherryPick.ts).

## Limitations

- Source and target must be branches of the same repository.
- Merge conflicts cannot be resolved in the browser. A conflict leaves the target branch unchanged;
  remove the conflicting commit from the queue or resolve it locally.
- Root commits cannot be cherry-picked.
- Repository permissions and branch protection rules still apply.

## Local development

Use Node.js 22, matching CI, and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

```sh
npm run lint       # Biome checks
npm run typecheck  # TypeScript checks
npm test           # Cherry-pick tests against a fake GitHub API
npm run build      # Production build
npm run preview    # Preview the build locally
```

The application uses React, TypeScript, Vite, Tailwind CSS, and TanStack Query. Diffs are rendered
with `@pierre/diffs`. UI components live in `src/components/`; GitHub access and cherry-pick logic
live in `src/lib/`.

## License

[WTFPL](LICENSE).
