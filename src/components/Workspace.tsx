import { clsx } from "clsx";
import { ExternalLink, Filter, Lock, RefreshCw } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppliedCommits, useBranches, useCommits, useGitHub, useRepo } from "../hooks/github";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { GitHubError } from "../lib/github";
import type { RepoRoute } from "../lib/route";
import { CommitList } from "./CommitList";
import { RepoInput } from "./RepoInput";
import { Kbd, TargetPanel } from "./TargetPanel";
import { TokenButton } from "./TokenButton";
import { BranchPicker } from "./ui/BranchPicker";
import { Button } from "./ui/Button";
import { Logo } from "./ui/Logo";
import { Spinner } from "./ui/Spinner";
import { ThemeToggle } from "./ui/ThemeToggle";

// The diff engine (Shiki grammars and themes) is heavy; load it after the shell paints.
const DiffView = lazy(() => import("./DiffView").then((m) => ({ default: m.DiffView })));

interface WorkspaceProps {
  route: RepoRoute;
  navigate(route: RepoRoute | null, options?: { replace?: boolean }): void;
}

export function Workspace({ route, navigate }: WorkspaceProps) {
  const { owner, repo: repoName } = route;
  const repo = useRepo(owner, repoName);
  const branches = useBranches(owner, repoName);

  const source = route.source ?? repo.data?.defaultBranch;
  const target = route.target;

  const commitPages = useCommits(owner, repoName, source);
  const commits = useMemo(() => commitPages.data?.pages.flat() ?? [], [commitPages.data]);
  const applied = useAppliedCommits(owner, repoName, source, target, commits);
  const appliedSet = useMemo(() => applied.data ?? new Set<string>(), [applied.data]);

  const [queued, setQueued] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState<string>();
  const [search, setSearch] = useState("");
  const [hideApplied, setHideApplied] = useLocalStorage("cherry.hide-applied", false);
  const lastToggled = useRef<string>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commits.filter(
      (c) =>
        (!hideApplied || !appliedSet.has(c.sha)) &&
        (!q ||
          c.subject.toLowerCase().includes(q) ||
          c.authorName.toLowerCase().includes(q) ||
          (c.authorLogin ?? "").toLowerCase().includes(q) ||
          c.sha.startsWith(q)),
    );
  }, [commits, search, hideApplied, appliedSet]);

  // Oldest first, so history replays in order.
  const queue = useMemo(() => commits.filter((c) => queued.has(c.sha)).reverse(), [commits, queued]);
  const focusedCommit = commits.find((c) => c.sha === focused) ?? visible[0];

  const [queueSource, setQueueSource] = useState(source);
  if (queueSource !== source) {
    setQueueSource(source);
    setQueued(new Set());
  }

  // Applied commits drop out of the queue.
  useEffect(() => {
    setQueued((current) => {
      const next = new Set([...current].filter((sha) => !appliedSet.has(sha)));
      return next.size === current.size ? current : next;
    });
  }, [appliedSet]);

  const setRoute = useCallback(
    (patch: Partial<RepoRoute>) =>
      navigate({ owner, repo: repoName, source: route.source, target: route.target, ...patch }, { replace: true }),
    [navigate, owner, repoName, route.source, route.target],
  );

  const toggle = useCallback(
    (sha: string, extendRange: boolean) => {
      setQueued((current) => {
        const next = new Set(current);
        const shouldQueue = !current.has(sha);
        const anchor = lastToggled.current;
        const from = anchor ? visible.findIndex((c) => c.sha === anchor) : -1;
        const to = visible.findIndex((c) => c.sha === sha);
        const range =
          extendRange && from >= 0 && to >= 0
            ? visible.slice(Math.min(from, to), Math.max(from, to) + 1)
            : visible.filter((c) => c.sha === sha);
        for (const commit of range) {
          if (commit.parents.length > 1) continue;
          if (shouldQueue) next.add(commit.sha);
          else next.delete(commit.sha);
        }
        return next;
      });
      lastToggled.current = sha;
    },
    [visible],
  );

  const focusAndReveal = useCallback((sha: string) => {
    setFocused(sha);
    requestAnimationFrame(() =>
      listRef.current?.querySelector(`[data-sha="${sha}"]`)?.scrollIntoView({ block: "nearest" }),
    );
  }, []);

  // Keyboard: j/k (or arrows) move, x/space queue.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const el = event.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable]") || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = visible.findIndex((c) => c.sha === focusedCommit?.sha);
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = visible[Math.min(index + 1, visible.length - 1)];
        if (next) focusAndReveal(next.sha);
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        const prev = visible[Math.max(index - 1, 0)];
        if (prev) focusAndReveal(prev.sha);
      } else if ((event.key === "x" || event.key === " ") && focusedCommit) {
        event.preventDefault();
        toggle(focusedCommit.sha, event.shiftKey);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, focusedCommit, toggle, focusAndReveal]);

  if (repo.isError) return <RepoError error={repo.error} route={route} onHome={() => navigate(null)} />;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/80 px-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => navigate(null)}
          className="flex items-center gap-2 rounded-lg pr-1"
          title="Home"
        >
          <Logo size={26} />
          <span className="text-sm font-semibold tracking-tight max-sm:hidden">Cherry</span>
        </button>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <div className="w-72">
          <RepoInput key={`${owner}/${repoName}`} initial={`${owner}/${repoName}`} onOpen={navigate} />
        </div>
        {repo.data?.isPrivate && (
          <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-900">
            <Lock className="size-3" /> Private
          </span>
        )}
        {repo.data && (
          <a
            href={repo.data.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
            title="Open on GitHub"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <TokenButton />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[400px_minmax(0,1fr)_340px]">
        {/* Source */}
        <section className="flex min-h-0 flex-col border-r border-zinc-200/80 dark:border-zinc-800">
          <div className="space-y-2.5 p-3">
            <div className="flex gap-2">
              <BranchPicker
                className="flex-1"
                label="from"
                branches={branches.data ?? []}
                value={source}
                defaultBranch={repo.data?.defaultBranch}
                onChange={(branch) => setRoute({ source: branch })}
                disabled={!branches.data}
              />
              <Button
                variant="secondary"
                className="w-9 px-0"
                title="Reload"
                onClick={() => void commitPages.refetch()}
              >
                <RefreshCw className={clsx("size-3.5", commitPages.isFetching && "animate-spin")} />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 flex-1 items-center gap-2 rounded-lg bg-zinc-100 px-2.5 dark:bg-zinc-900">
                <Filter className="size-3.5 shrink-0 text-zinc-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter message, author, sha"
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-zinc-400"
                />
              </div>
              <label
                className={clsx(
                  "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs transition",
                  hideApplied
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                )}
              >
                <input
                  type="checkbox"
                  checked={hideApplied}
                  onChange={(e) => setHideApplied(e.target.checked)}
                  className="size-3 accent-emerald-600"
                />
                Hide applied
              </label>
            </div>
          </div>

          <div ref={listRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {commitPages.isPending || repo.isPending ? (
              <ListSkeleton />
            ) : commitPages.isError ? (
              <p className="p-6 text-sm text-cherry-600">{commitPages.error.message}</p>
            ) : (
              <>
                <CommitList
                  commits={visible}
                  applied={appliedSet}
                  queued={queued}
                  focused={focusedCommit?.sha}
                  onFocus={setFocused}
                  onToggle={toggle}
                />
                {visible.length === 0 && (
                  <p className="px-6 py-10 text-center text-sm text-zinc-400">No commits match.</p>
                )}
                {commitPages.hasNextPage && (
                  <div className="px-3 pb-4">
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => void commitPages.fetchNextPage()}
                      disabled={commitPages.isFetchingNextPage}
                    >
                      {commitPages.isFetchingNextPage ? <Spinner /> : "Load older commits"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex h-9 shrink-0 items-center gap-2 border-t border-zinc-200/80 px-3 text-[11px] text-zinc-400 dark:border-zinc-800">
            {applied.isFetching ? (
              <span className="flex items-center gap-1.5">
                <Spinner className="size-3" /> Comparing with {target}…
              </span>
            ) : (
              <span className="truncate">
                {commits.length} commits{target && applied.data ? ` · ${appliedSet.size} in ${target}` : ""}
              </span>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1">
              <Kbd>j</Kbd>
              <Kbd>k</Kbd> move <Kbd>x</Kbd> queue
            </span>
          </div>
        </section>

        {/* Diff */}
        <section className="min-h-0 min-w-0">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Spinner className="text-zinc-300" />
              </div>
            }
          >
            <DiffView owner={owner} repo={repoName} commit={focusedCommit} />
          </Suspense>
        </section>

        {/* Target */}
        {repo.data ? (
          <TargetPanel
            repo={repo.data}
            branches={branches.data ?? []}
            source={source}
            target={target}
            onTargetChange={(branch) => setRoute({ target: branch })}
            queue={queue}
            onDequeue={(sha) => toggle(sha, false)}
            onFocus={focusAndReveal}
            onPicked={() => setQueued(new Set())}
          />
        ) : (
          <aside className="border-l border-zinc-200/80 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/30" />
        )}
      </main>
    </div>
  );
}

const SKELETON_WIDTHS = [72, 58, 91, 64, 83, 55, 77, 69, 88, 61, 94, 66];

function ListSkeleton() {
  return (
    <ul className="space-y-1 px-3 py-1">
      {SKELETON_WIDTHS.map((width) => (
        <li key={width} className="flex animate-pulse items-start gap-3 py-2">
          <span className="size-[18px] rounded-[5px] bg-zinc-100 dark:bg-zinc-900" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 rounded bg-zinc-100 dark:bg-zinc-900" style={{ width: `${width}%` }} />
            <span className="block h-2.5 w-1/3 rounded bg-zinc-100 dark:bg-zinc-900" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function RepoError({ error, route, onHome }: { error: Error; route: RepoRoute; onHome(): void }) {
  const { token } = useGitHub();
  const notFound = error instanceof GitHubError && error.status === 404;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo size={40} />
      <div>
        <h1 className="text-lg font-semibold">
          {notFound ? `Can't find ${route.owner}/${route.repo}` : "Couldn't load this repository"}
        </h1>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          {notFound
            ? token
              ? "Check the name, or make sure your token can access it."
              : "If it's private, add a GitHub token."
            : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onHome}>Back</Button>
        <TokenButton />
      </div>
    </div>
  );
}
