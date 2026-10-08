import { useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ArrowRight, CircleAlert, ExternalLink, GitPullRequestArrow, ListChecks, Upload, X } from "lucide-react";
import { useState } from "react";
import { useGitHub } from "../hooks/github";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  CherryPickConflictError,
  type CherryPickProgress,
  type CherryPickResult,
  cherryPick,
  type DeliveryMode,
} from "../lib/cherryPick";
import { plural } from "../lib/format";
import type { Branch, Commit, Repo } from "../lib/github";
import { TokenDialog } from "./TokenDialog";
import { BranchPicker } from "./ui/BranchPicker";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import { useToast } from "./ui/Toast";

interface TargetPanelProps {
  repo: Repo;
  branches: Branch[];
  source?: string;
  target?: string;
  onTargetChange(branch: string): void;
  /** Queued commits, oldest first. */
  queue: Commit[];
  onDequeue(sha: string): void;
  onFocus(sha: string): void;
  onPicked(): void;
}

type Outcome =
  | { kind: "success"; result: CherryPickResult }
  | { kind: "conflict"; commit: Commit }
  | { kind: "error"; message: string };

export function TargetPanel({
  repo,
  branches,
  source,
  target,
  onTargetChange,
  queue,
  onDequeue,
  onFocus,
  onPicked,
}: TargetPanelProps) {
  const { client, token } = useGitHub();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [mode, setMode] = useLocalStorage<DeliveryMode>("cherry.mode", "pull-request");
  const [recordOrigin, setRecordOrigin] = useLocalStorage("cherry.record-origin", true);
  const [progress, setProgress] = useState<CherryPickProgress | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [askToken, setAskToken] = useState(false);

  const busy = progress !== null;
  const sameBranch = Boolean(source && source === target);
  const canPick = Boolean(target) && queue.length > 0 && !busy && !sameBranch;
  const targetProtected = branches.find((b) => b.name === target)?.isProtected;

  async function run() {
    if (!token) return setAskToken(true);
    if (!target) return;

    setOutcome(null);
    try {
      const result = await cherryPick(
        client,
        { owner: repo.owner, repo: repo.name, targetBranch: target, commits: queue, recordOrigin, mode },
        setProgress,
      );
      setOutcome({ kind: "success", result });
      toast(
        result.pullRequest
          ? `Opened pull request #${result.pullRequest.number}`
          : `Pushed ${plural(result.applied.length, "commit")} to ${target}`,
        "success",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["applied", repo.owner, repo.name] }),
        queryClient.invalidateQueries({ queryKey: ["branches", repo.owner, repo.name] }),
      ]);
      onPicked();
    } catch (error) {
      if (error instanceof CherryPickConflictError) {
        setOutcome({ kind: "conflict", commit: error.commit });
        onFocus(error.commit.sha);
      } else {
        setOutcome({ kind: "error", message: error instanceof Error ? error.message : String(error) });
      }
    } finally {
      setProgress(null);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-zinc-200/80 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="space-y-2.5 p-4">
        <h3 className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Target</h3>
        <BranchPicker
          label="into"
          branches={branches}
          value={target}
          defaultBranch={repo.defaultBranch}
          onChange={onTargetChange}
        />
        {sameBranch && <p className="text-xs text-cherry-600">Source and target are the same branch.</p>}
      </div>

      <div className="flex items-center gap-2 px-4 pt-2 pb-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Queue</h3>
        {queue.length > 0 && (
          <span className="rounded-full bg-cherry-100 px-1.5 text-[11px] font-semibold text-cherry-700 dark:bg-cherry-950 dark:text-cherry-300">
            {queue.length}
          </span>
        )}
        {queue.length > 1 && <span className="ml-auto text-[11px] text-zinc-400">oldest first</span>}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3">
        {queue.length === 0 ? (
          <div className="mx-1 flex flex-col items-center rounded-xl border-[1.5px] border-dashed border-zinc-200 px-6 py-10 text-center dark:border-zinc-800">
            <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800/80">
              <ListChecks className="size-5" />
            </div>
            <p className="mt-3 text-sm font-medium">Queue is empty</p>
            <p className="mt-1 text-xs text-zinc-500">
              Tick commits on the left. Press <Kbd>x</Kbd> to queue the focused one.
            </p>
          </div>
        ) : (
          <ol className="space-y-1.5 pb-2">
            {queue.map((commit, index) => {
              const active = progress?.stage === "picking" && progress.commit.sha === commit.sha;
              const conflicted = outcome?.kind === "conflict" && outcome.commit.sha === commit.sha;
              return (
                <li
                  key={commit.sha}
                  className={clsx(
                    "group flex animate-slide-up items-center gap-2.5 rounded-xl bg-white px-2.5 py-2 ring-1 transition dark:bg-zinc-900",
                    conflicted
                      ? "ring-cherry-400"
                      : active
                        ? "ring-cherry-300 dark:ring-cherry-800"
                        : "ring-zinc-200 dark:ring-zinc-800",
                  )}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cherry-50 text-[10.5px] font-bold text-cherry-600 dark:bg-cherry-950/70 dark:text-cherry-400">
                    {active ? <Spinner className="size-3" /> : index + 1}
                  </span>
                  <button type="button" onClick={() => onFocus(commit.sha)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[13px] font-medium">{commit.subject}</p>
                    <p className="font-mono text-[11px] text-zinc-400">{commit.shortSha}</p>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDequeue(commit.sha)}
                    className="rounded-md p-1 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                    aria-label="Remove from queue"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {outcome && <OutcomeCard outcome={outcome} target={target} onDismiss={() => setOutcome(null)} />}

      <div className="space-y-3 border-t border-zinc-200/80 p-4 dark:border-zinc-800">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-200/60 p-0.5 dark:bg-zinc-800/70">
          {(
            [
              ["pull-request", GitPullRequestArrow, "Pull request"],
              ["push", Upload, "Push"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={clsx(
                "flex h-7 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition",
                mode === value
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>

        {mode === "push" && targetProtected && (
          <p className="text-xs text-amber-600">{target} is protected; pushing may be rejected.</p>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={recordOrigin}
            onChange={(e) => setRecordOrigin(e.target.checked)}
            className="size-3.5 accent-cherry-600"
          />
          Add “cherry picked from” line to messages
        </label>

        <Button variant="primary" size="lg" className="w-full" disabled={!canPick} onClick={run}>
          {busy ? <Spinner /> : <ArrowRight className="size-4" />}
          {busy
            ? progressLabel(progress)
            : queue.length > 0
              ? `Cherry-pick ${plural(queue.length, "commit")}`
              : "Cherry-pick"}
        </Button>
        <p className="truncate text-center text-xs text-zinc-400">
          {!token
            ? "Add a GitHub token to cherry-pick"
            : !repo.canPush
              ? "Your token can't push to this repo"
              : target
                ? `${source ?? "…"} → ${target}`
                : "Choose a target branch"}
        </p>
      </div>

      {askToken && <TokenDialog onClose={() => setAskToken(false)} />}
    </aside>
  );
}

function OutcomeCard({ outcome, target, onDismiss }: { outcome: Outcome; target?: string; onDismiss(): void }) {
  const success = outcome.kind === "success";
  return (
    <div
      className={clsx(
        "mx-3 mb-3 animate-slide-up rounded-xl p-3.5 text-sm ring-1",
        success
          ? "bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900"
          : "bg-cherry-50 ring-cherry-200 dark:bg-cherry-950/30 dark:ring-cherry-900",
      )}
    >
      <div className="flex items-start gap-2">
        {!success && <CircleAlert className="mt-0.5 size-4 shrink-0 text-cherry-600" />}
        <div className="min-w-0 flex-1">
          {outcome.kind === "success" && (
            <>
              <p className="font-medium text-emerald-800 dark:text-emerald-300">
                {outcome.result.applied.length === 0
                  ? "Nothing to pick: every change was already there."
                  : outcome.result.pullRequest
                    ? `Pull request #${outcome.result.pullRequest.number} is open`
                    : `Pushed to ${target}`}
              </p>
              {outcome.result.skipped.length > 0 && (
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                  Skipped {plural(outcome.result.skipped.length, "commit")} with no remaining changes.
                </p>
              )}
              {outcome.result.pullRequest && (
                <a
                  href={outcome.result.pullRequest.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                >
                  Review on GitHub <ExternalLink className="size-3" />
                </a>
              )}
            </>
          )}
          {outcome.kind === "conflict" && (
            <>
              <p className="font-medium text-cherry-800 dark:text-cherry-300">Conflict in {outcome.commit.shortSha}</p>
              <p className="mt-1 text-xs text-cherry-700/80 dark:text-cherry-300/80">
                “{outcome.commit.subject}” doesn't apply cleanly to {target}. Nothing was changed. Remove it from the
                queue, or pick it locally.
              </p>
            </>
          )}
          {outcome.kind === "error" && (
            <>
              <p className="font-medium text-cherry-800 dark:text-cherry-300">Cherry-pick failed</p>
              <p className="mt-1 text-xs break-words text-cherry-700/80 dark:text-cherry-300/80">{outcome.message}</p>
            </>
          )}
        </div>
        <button type="button" onClick={onDismiss} className="text-zinc-400 hover:text-zinc-600" aria-label="Dismiss">
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function progressLabel(progress: CherryPickProgress | null) {
  switch (progress?.stage) {
    case "picking":
      return `Picking ${progress.index + 1} of ${progress.total}…`;
    case "finishing":
      return "Finishing…";
    default:
      return "Preparing…";
  }
}

export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-zinc-200 bg-white px-1 font-mono text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
      {children}
    </kbd>
  );
}
