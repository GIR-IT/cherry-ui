# Cherry for GitHub (Chrome extension)

Opens the GitHub page you're on in [cherry-ui.com](https://cherry-ui.com).

- **Cherry-pick button** in the repository header (next to Sponsor / Watch / Fork / Star) and on pull requests, at the end of the "wants to merge … from `branch`" line.
- **Toolbar icon** and **Alt+Shift+C** open the current tab in Cherry.

| GitHub page | Opens |
|---|---|
| `github.com/org/repo` (and any page inside it) | `cherry-ui.com/org/repo` |
| `…/tree/feature` or `…/commits/feature` | `…?from=feature` |
| `…/compare/main...feature` | `…/compare/main...feature` (pick from `feature` into `main`) |
| `…/pull/123` | `…?from=<head branch>` (repo root when the PR comes from a fork) |

Permissions: `activeTab` (to read the current tab's URL when you click the icon or use the shortcut) and a content script on `github.com`. Nothing is collected or sent anywhere.

## Install (unpacked)

1. Open `chrome://extensions` and switch on **Developer mode**.
2. Click **Load unpacked** and choose this `extension/` folder.
3. Optional: change the shortcut at `chrome://extensions/shortcuts`.

## Package for the Chrome Web Store

```bash
npm run extension:zip
```

This writes `cherry-extension.zip` to the repository root.

## Notes

GitHub's React UI uses hashed class names, so the button copies the classes of GitHub's own neighbouring button instead of hard-coding them, and re-inserts itself after client-side navigation. If GitHub restructures the header, the toolbar icon and shortcut keep working.
