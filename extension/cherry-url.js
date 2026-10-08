// Maps a github.com URL to the matching cherry-ui.com URL. Shared by the content script and the
// service worker, so it is a classic script that defines a global instead of a module.

/** First path segments on github.com that are never an owner. */
const GITHUB_RESERVED = new Set([
  "about",
  "apps",
  "codespaces",
  "collections",
  "dashboard",
  "enterprise",
  "explore",
  "features",
  "issues",
  "login",
  "marketplace",
  "new",
  "notifications",
  "organizations",
  "orgs",
  "pricing",
  "pulls",
  "search",
  "settings",
  "sponsors",
  "topics",
  "trending",
  "users",
]);

const CHERRY_ORIGIN = "https://cherry-ui.com";

/**
 * @param {string} href A github.com URL.
 * @param {{ headBranch?: string }} [context] Extra details read from the page, e.g. a PR's branch.
 * @returns {string | null} The Cherry URL, or null when the page isn't inside a repository.
 */
// biome-ignore lint/correctness/noUnusedVariables: global used by content.js and background.js
function cherryUrlFor(href, context = {}) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.hostname !== "github.com") return null;

  const [owner, repo, kind, ...rest] = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (!owner || !repo || GITHUB_RESERVED.has(owner.toLowerCase())) return null;

  const base = `${CHERRY_ORIGIN}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const ref = rest.join("/");

  // compare/main...feature → pick from feature into main.
  if (kind === "compare" && ref.includes("...")) return `${base}/compare/${ref}`;
  if ((kind === "tree" || kind === "commits") && ref) return `${base}?from=${encodeURIComponent(ref)}`;
  // A pull request's commits live on its head branch (only usable when it isn't on a fork).
  if (kind === "pull" && context.headBranch && !context.headBranch.includes(":"))
    return `${base}?from=${encodeURIComponent(context.headBranch)}`;
  return base;
}
