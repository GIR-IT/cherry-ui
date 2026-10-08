import { clsx } from "clsx";
import { Lock, RotateCw } from "lucide-react";
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
import { Mark } from "./ui/Logo";
import { ProgressBar } from "./ui/ProgressBar";

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
  const [editingRepo, setEditingRepo] = useState(false);
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
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3">
        <button type="button" onClick={() => navigate(null)} className="rounded p-0.5" aria-label="Cherry home">
          <Mark />
        </button>
        <span className="text-ink-3">/</span>
        {editingRepo ? (
          <RepoInput
            className="w-96"
            autoFocus
            initial={`${owner}/${repoName}`}
            onOpen={(next) => {
              setEditingRepo(false);
              navigate(next);
            }}
            onCancel={() => setEditingRepo(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingRepo(true)}
            title="Open another repository"
            className="rounded px-1 py-0.5 font-mono text-[13px] hover:bg-hover"
          >
            <span className="text-ink-2">{owner}</span>
            <span className="mx-1 text-ink-3">/</span>
            <span className="font-medium text-ink">{repoName}</span>
          </button>
        )}
        {repo.data?.isPrivate && (
          <span className="flex items-center gap-1 text-xs text-ink-3">
            <Lock className="size-3" strokeWidth={1.5} /> private
          </span>
        )}
        {repo.data && (
          <a href={repo.data.htmlUrl} target="_blank" rel="noreferrer" className="text-xs text-ink-3 hover:text-ink">
            GitHub ↗
          </a>
        )}
        <div className="ml-auto">
          <TokenButton />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[380px_minmax(0,1fr)_320px]">
        {/* Source */}
        <section aria-label="Commits" className="flex min-h-0 flex-col border-r border-line">
          <div className="flex gap-1.5 p-3 pb-2">
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
              variant="ghost"
              className="w-7 px-0"
              aria-label="Reload commits"
              title="Reload"
              onClick={() => void commitPages.refetch()}
            >
              <RotateCw className={clsx("size-3.5", commitPages.isFetching && "animate-spin")} strokeWidth={1.5} />
            </Button>
          </div>
          <div className="flex items-center gap-3 border-b border-line px-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter commits"
              aria-label="Filter commits"
              className="h-8 min-w-0 flex-1 bg-transparent outline-none"
            />
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-ink-2">
              <input
                type="checkbox"
                checked={hideApplied}
                onChange={(e) => setHideApplied(e.target.checked)}
                className="size-3 accent-ink"
              />
              {target ? `Hide commits in ${target}` : "Hide applied"}
            </label>
          </div>

          <div ref={listRef} className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto">
            {commitPages.isPending || repo.isPending ? (
              <>
                <ProgressBar />
                <p className="p-3 font-mono text-xs text-ink-3">Loading commits...</p>
              </>
            ) : commitPages.isError ? (
              <p className="p-3 text-err">{commitPages.error.message}</p>
            ) : (
              <>
                <CommitList
                  commits={visible}
                  applied={appliedSet}
                  queued={queued}
                  focused={focusedCommit?.sha}
                  target={target}
                  onFocus={setFocused}
                  onToggle={toggle}
                />
                {visible.length === 0 && (
                  <p className="p-3 text-ink-3">
                    {search ? `No commits match "${search}".` : "No commits to show."}{" "}
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="text-ink-2 underline underline-offset-2"
                      >
                        Clear filter
                      </button>
                    )}
                  </p>
                )}
                {commitPages.hasNextPage && (
                  <button
                    type="button"
                    onClick={() => void commitPages.fetchNextPage()}
                    disabled={commitPages.isFetchingNextPage}
                    className="h-8 w-full text-xs text-ink-2 hover:bg-hover hover:text-ink"
                  >
                    {commitPages.isFetchingNextPage ? "Loading..." : "Load older commits"}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex h-8 shrink-0 items-center gap-3 border-t border-line px-3 font-mono text-xs text-ink-3">
            <span className="tabular truncate">
              {applied.isFetching
                ? `Checking ${target}...`
                : `${commits.length} commits${target && applied.data ? ` · ${appliedSet.size} in ${target}` : ""}`}
            </span>
            <span className="ml-auto shrink-0">
              <Kbd>j</Kbd>/<Kbd>k</Kbd> move · <Kbd>x</Kbd> queue
            </span>
          </div>
        </section>

        {/* Diff */}
        <section aria-label="Diff" className="min-h-0 min-w-0">
          <Suspense fallback={<p className="p-4 font-mono text-xs text-ink-3">Loading diff...</p>}>
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
          <aside className="border-l border-line" />
        )}
      </main>
    </div>
  );
}

function RepoError({ error, route, onHome }: { error: Error; route: RepoRoute; onHome(): void }) {
  const { token } = useGitHub();
  const notFound = error instanceof GitHubError && error.status === 404;
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pt-[18vh]">
      <h1 className="text-base font-semibold tracking-[-0.01em]">
        {notFound ? (
          <>
            Can't find <span className="font-mono">{`${route.owner}/${route.repo}`}</span>
          </>
        ) : (
          "Couldn't load this repository"
        )}
      </h1>
      <p className="mt-1 text-ink-2">
        {notFound
          ? token
            ? "Check the name, or make sure your token can access it."
            : "Check the name. If it's private, add a token."
          : error.message}
      </p>
      <div className="mt-5 flex gap-2">
        <Button onClick={onHome}>Back</Button>
        <TokenButton />
      </div>
    </div>
  );
}
