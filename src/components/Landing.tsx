import { GitPullRequestArrow, ListChecks, ScanEye } from "lucide-react";
import type { RepoRoute } from "../lib/route";
import { RepoInput } from "./RepoInput";
import { TokenButton } from "./TokenButton";
import { Logo } from "./ui/Logo";
import { ThemeToggle } from "./ui/ThemeToggle";

const examples = ["github.com/honojs/hono", "github.com/oven-sh/bun", "github.com/vitejs/vite/compare/v6...main"];

const steps = [
  { icon: ScanEye, title: "Browse", text: "Every commit on a branch, with a fast, virtualized diff viewer." },
  { icon: ListChecks, title: "Queue", text: "Tick the commits you need. Ones already in the target are flagged." },
  {
    icon: GitPullRequestArrow,
    title: "Land",
    text: "Cherry-pick server-side into a pull request, or push straight to the branch.",
  },
];

export function Landing({ onOpen }: { onOpen(route: RepoRoute): void }) {
  const host = window.location.host;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-[15px] font-semibold tracking-tight">Cherry</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <TokenButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 pb-24">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Cherry-pick on GitHub, <span className="text-cherry-600">right from your browser.</span>
        </h1>
        <p className="mt-4 text-lg text-zinc-500 text-pretty">
          Pick commits from one branch, review their diffs, and land them on another, as a pull request or a direct
          push. No clone, no terminal.
        </p>

        <div className="mt-8 overflow-hidden rounded-xl bg-zinc-50 font-mono text-[13px] ring-1 ring-zinc-200 dark:bg-zinc-900/60 dark:ring-zinc-800">
          <div className="flex gap-3 bg-cherry-50/70 px-4 py-2 text-cherry-800 dark:bg-cherry-950/40 dark:text-cherry-300">
            <span className="select-none">-</span>
            <span>
              <b>github.com</b>/org/repo/compare/release...main
            </span>
          </div>
          <div className="flex gap-3 bg-emerald-50/70 px-4 py-2 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <span className="select-none">+</span>
            <span>
              <b>{host}</b>/org/repo/compare/release...main
            </span>
          </div>
        </div>

        <div className="mt-6">
          <RepoInput size="lg" autoFocus onOpen={onOpen} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-400">Try</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onOpen(parseExample(example))}
              className="rounded-full bg-zinc-100 px-3 py-1 font-mono text-xs text-zinc-600 transition hover:bg-cherry-50 hover:text-cherry-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-cherry-950/50 dark:hover:text-cherry-300"
            >
              {example.replace("github.com/", "")}
            </button>
          ))}
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="size-5 text-cherry-600" />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-zinc-500 text-pretty">{text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-zinc-400">
        Runs entirely in your browser. Your token never touches our servers.
      </footer>
    </div>
  );
}

function parseExample(example: string): RepoRoute {
  const [owner, repo, , range] = example.replace("github.com/", "").split("/");
  if (!range) return { owner, repo };
  const [target, source] = range.split("...");
  return { owner, repo, target, source };
}
