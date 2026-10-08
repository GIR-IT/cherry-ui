import type { RepoRoute } from "../lib/route";
import { RepoInput } from "./RepoInput";
import { TokenButton } from "./TokenButton";
import { Wordmark } from "./ui/Logo";

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
        <TokenButton />
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

      <footer className="px-4 py-4 text-xs text-ink-3">
        Runs in your browser. Your token is stored in localStorage and sent only to api.github.com.
      </footer>
    </div>
  );
}
