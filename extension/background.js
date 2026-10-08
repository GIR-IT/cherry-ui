importScripts("cherry-url.js");

async function openInCherry(tab) {
  if (!tab?.url) return;

  // On pull requests the content script knows the head branch; ask it, but don't depend on it.
  let context = {};
  try {
    context = (await chrome.tabs.sendMessage(tab.id, { type: "cherry:context" })) ?? {};
  } catch {
    /* not a GitHub page, or the content script isn't loaded yet */
  }

  const url = cherryUrlFor(tab.url, context) ?? CHERRY_ORIGIN;
  await chrome.tabs.create({ url, index: tab.index + 1, openerTabId: tab.id });
}

chrome.action.onClicked.addListener(openInCherry);

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "open-in-cherry") await openInCherry(tab);
});
