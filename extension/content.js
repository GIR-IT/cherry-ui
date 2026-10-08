// Adds a "Cherry-pick" button to GitHub repository and pull request headers.
//
// GitHub's markup changes often and its React UI uses hashed class names, so the button copies the
// classes of a neighbouring Primer button where one exists and falls back to its own styling.
// GitHub also navigates without page loads, so placement is re-checked whenever the DOM changes.

const MARKER = "data-cherry-ui";
const TITLE = "Open in Cherry to cherry-pick commits";
const SVG_NS = "http://www.w3.org/2000/svg";

function createMark() {
  const svg = document.createElementNS(SVG_NS, "svg");
  for (const [k, v] of Object.entries({
    viewBox: "0 0 16 16",
    width: "16",
    height: "16",
    fill: "none",
    "aria-hidden": "true",
  }))
    svg.setAttribute(k, v);
  svg.classList.add("cherry-ui-mark");
  const stem = document.createElementNS(SVG_NS, "path");
  stem.setAttribute("d", "M9 1.75C7.25 4 5.75 7 5 9.5M9 1.75c1.4 2 2.3 4.4 2.5 6.75");
  stem.setAttribute("stroke", "currentColor");
  stem.setAttribute("stroke-width", "1.5");
  stem.setAttribute("stroke-linecap", "round");
  const left = document.createElementNS(SVG_NS, "circle");
  for (const [k, v] of Object.entries({ cx: "4.75", cy: "11.75", r: "2.75", fill: "currentColor" }))
    left.setAttribute(k, v);
  const right = document.createElementNS(SVG_NS, "circle");
  for (const [k, v] of Object.entries({ cx: "11.5", cy: "10.75", r: "2.75", fill: "#ff5c7a" }))
    right.setAttribute(k, v);
  svg.append(stem, left, right);
  return svg;
}

function span(className, ...children) {
  const el = document.createElement("span");
  if (className) el.className = className;
  el.append(...children);
  return el;
}

/** A link that looks like `template` (a Primer React button) or, without one, like our fallback. */
function createButton(href, template) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  link.title = TITLE;
  link.setAttribute(MARKER, "");

  if (template) {
    link.className = template.className;
    for (const name of ["data-component", "data-size", "data-variant", "data-loading"]) {
      const value = template.getAttribute(name);
      if (value !== null) link.setAttribute(name, value);
    }
    const classOf = (part) => template.querySelector(`[data-component="${part}"]`)?.className ?? "";
    const visual = span(classOf("leadingVisual"), createMark());
    visual.dataset.component = "leadingVisual";
    const text = span(classOf("text"), "Cherry-pick");
    text.dataset.component = "text";
    const content = span(classOf("buttonContent"), visual, text);
    content.dataset.component = "buttonContent";
    content.dataset.align = "center";
    link.append(content);
  } else {
    link.className = "cherry-ui-fallback";
    link.append(createMark(), span("", "Cherry-pick"));
  }
  return link;
}

/** Inserts the button once per `scope`, or updates its link if the page changed underneath it. */
function place(scope, href, insert) {
  const existing = scope.querySelector(`[${MARKER}]`);
  if (existing) {
    if (existing.href !== href) existing.href = href;
    return;
  }
  insert();
}

// ── Pull requests ──────────────────────────────────────────────────────────

/** The PR's branch links, base first then head ("wants to merge … into base from head"). */
function pullRequestBranchLinks() {
  const links = [...document.querySelectorAll('a[class*="BranchName"]')];
  if (links.length >= 2) return { base: links[0], head: links[1] };
  // Classic layout.
  const base = document.querySelector(".base-ref a, .base-ref");
  const head = document.querySelector(".head-ref a, .head-ref");
  return base && head ? { base, head } : null;
}

/** Head branch of the PR, or `owner:branch` when it lives on a fork (which Cherry can't read). */
function pullRequestHeadBranch() {
  const links = pullRequestBranchLinks();
  if (!links) return undefined;
  const name = links.head.textContent.trim();
  const repoPath = location.pathname.split("/").slice(1, 3).join("/");
  const headPath = links.head.getAttribute?.("href")?.split("/").slice(1, 3).join("/");
  return headPath && headPath !== repoPath ? `${headPath.split("/")[0]}:${name}` : name;
}

function pageContext() {
  return { headBranch: location.pathname.includes("/pull/") ? pullRequestHeadBranch() : undefined };
}

// ── Placement ──────────────────────────────────────────────────────────────

function update() {
  const href = cherryUrlFor(location.href, pageContext());
  if (!href) {
    for (const button of document.querySelectorAll(`[${MARKER}]`))
      (button.closest(`[${MARKER}-item]`) ?? button).remove();
    return;
  }

  // Repository header, next to Watch / Fork / Star. React owns that list and drops foreign
  // children on re-render, so the button goes just before it; content.css lays the two out in a row.
  const reactActions = document.querySelector('ul[data-testid="repo-header-actions"]');
  if (reactActions?.parentElement)
    place(reactActions.parentElement, href, () => {
      const item = document.createElement("div");
      item.setAttribute(`${MARKER}-item`, "");
      item.append(createButton(href, reactActions.querySelector('[data-component="Button"]')));
      reactActions.before(item);
    });

  // Classic server-rendered header.
  const classicActions = document.querySelector("ul.pagehead-actions");
  if (classicActions)
    place(classicActions, href, () => {
      const item = document.createElement("li");
      item.setAttribute(`${MARKER}-item`, "");
      const button = createButton(href, null);
      button.className = "btn btn-sm cherry-ui-classic";
      item.append(button);
      classicActions.prepend(item);
    });

  // Pull request: at the end of the "wants to merge … from <branch>" line.
  if (location.pathname.includes("/pull/")) {
    const line = pullRequestBranchLinks()?.head.closest("div, span");
    const row = line?.parentElement?.closest("div") ?? line;
    if (row) place(row, href, () => row.append(createButton(href, null)));
  }
}

let scheduled = false;
function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    update();
  });
}

new MutationObserver(scheduleUpdate).observe(document.body, { childList: true, subtree: true });
document.addEventListener("turbo:load", scheduleUpdate);
update();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "cherry:context") sendResponse(pageContext());
});
