import type { RepoRoute } from "../lib/route";
import { RepoInput } from "./RepoInput";
import { TokenButton } from "./TokenButton";
import { Wordmark } from "./ui/Logo";

const REPO_URL = "https://github.com/GIR-IT/cherry-ui";

const examples: { label: string; route: RepoRoute }[] = [
  { label: "honojs/hono", route: { owner: "honojs", repo: "hono" } },
  { label: "oven-sh/bun", route: { owner: "oven-sh", repo: "bun" } },
  { label: "vitejs/vite v6...main", route: { owner: "vitejs", repo: "vite", target: "v6", source: "main" } },
];

export function Landing({ onOpen }: { onOpen(route: RepoRoute): void }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-11 items-center justify-between px-4">
        <Wordmark />
        <div className="flex items-center gap-1">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex h-7 items-center gap-1.5 rounded px-2.5 font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <GitHubMark />
            GitHub
          </a>
          <TokenButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pt-[18vh] pb-16">
        <h1 className="text-balance text-[28px] leading-[34px] font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[38px]">
          Cherry-pick on GitHub without a clone.
        </h1>
        <p className="mt-4 text-[15px] leading-6 text-ink-2">
          Replace <code className="font-mono text-[13px] text-ink">github.com</code> with{" "}
          <code className="font-mono text-[13px] text-ink">cherry-ui.com</code> in any repo or compare URL. Browse the
          commits, queue the ones you want, and land them as a pull request or a direct push.
        </p>

        <div className="mt-10 border-y border-line py-3 font-mono text-[13px] leading-6" aria-hidden="true">
          <div className="truncate text-ink-3">
            <span className="mr-3 select-none">-</span>https://
            <span className="rounded-[2px] bg-err/15 px-0.5 text-ink-2">github.com</span>
            /org/repo/compare/release...main
          </div>
          <div className="truncate">
            <span className="mr-3 select-none text-ink-3">+</span>https://
            <span className="rounded-[2px] bg-ok/15 px-0.5">cherry-ui.com</span>
            /org/repo/compare/release...main
          </div>
        </div>

        <RepoInput className="mt-10" autoFocus onOpen={onOpen} />

        <p className="mt-3 text-xs text-ink-3">
          Try{" "}
          {examples.map(({ label, route }, index) => (
            <span key={label}>
              <button
                type="button"
                onClick={() => onOpen(route)}
                className="font-mono text-ink-2 underline-offset-2 hover:text-ink hover:underline"
              >
                {label}
              </button>
              {index < examples.length - 1 && <span className="mx-1.5">·</span>}
            </span>
          ))}
        </p>
      </main>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 text-xs text-ink-3">
        <span>Runs in your browser. Your token is stored in localStorage and sent only to api.github.com.</span>
        <span className="ml-auto flex gap-4">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-ink">
            Source on GitHub
          </a>
          <a href="/privacy" className="hover:text-ink">
            Privacy
          </a>
        </span>
      </footer>
    </div>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
