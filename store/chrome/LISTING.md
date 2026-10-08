# Chrome Web Store listing

Everything the Web Store dashboard asks for, ready to paste. Images are in this folder.

## Store listing

**Name:** Cherry for GitHub

**Summary** (max 132 characters):
> Open any GitHub repo, branch, compare view or pull request in Cherry and cherry-pick its commits into another branch.

**Description:**
> Cherry (cherry-ui.com) lets you cherry-pick commits on GitHub from your browser: browse a branch, review each commit's diff, queue the ones you want, and land them on another branch as a pull request or a direct push. No clone, no terminal.
>
> This extension gets you there in one click:
>
> • A Cherry-pick button in every repository header, next to Watch, Fork and Star.
> • On pull requests, a button that opens the pull request's branch in Cherry.
> • Click the toolbar icon or press Alt+Shift+C to open the current GitHub page in Cherry.
>
> Branch and compare URLs carry over: github.com/org/repo/compare/release...main opens with main as the source and release as the target.
>
> The extension collects no data and runs only on github.com. Cherry is open source: github.com/GIR-IT/cherry-ui

**Category:** Developer Tools
**Language:** English

**Graphics**
- Icon: `extension/icons/icon-128.png`
- Screenshots (1280×800): `screenshot-1-repo.png`, `screenshot-2-pull-request.png`
- Small promo tile (440×280): `promo-tile-440x280.png`

**Official URL / homepage:** https://cherry-ui.com
**Support URL:** https://github.com/GIR-IT/cherry-ui/issues

## Privacy practices

**Single purpose:**
> Open the GitHub page you are viewing in cherry-ui.com, a web app for cherry-picking commits, by adding a button to GitHub and a toolbar action.

**Permission justifications**
- `activeTab`: Read the current tab's URL when the user clicks the toolbar icon or presses the keyboard shortcut, to open the matching cherry-ui.com page.
- Host permission (content script on `https://github.com/*`): Add the Cherry-pick button to GitHub repository and pull request pages, and read the pull request's branch name from the page.

**Remote code:** No, I am not using remote code.

**Data usage:** The extension does not collect or transmit any user data. Tick none of the data categories and certify all three statements (no selling, no unrelated use, no creditworthiness use).

**Privacy policy URL:** https://cherry-ui.com/privacy
