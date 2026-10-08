import { useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
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

const modes: { value: DeliveryMode; label: string }[] = [
  { value: "pull-request", label: "Open a pull request" },
  { value: "push", label: "Push to the branch" },
];

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
      if (result.applied.length > 0)
        toast(
          result.pullRequest
            ? `Opened #${result.pullRequest.number}`
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

  const status = !token
    ? "Add a token to continue"
    : !repo.canPush
      ? "Your token can't push to this repo"
      : !target
        ? "Choose a target branch"
        : `${source ?? ""} → ${target}`;

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-line">
      <section className="space-y-2 p-3">
        <h3 className="text-xs font-medium text-ink-2">Target</h3>
        <BranchPicker
          label="into"
          branches={branches}
          value={target}
          defaultBranch={repo.defaultBranch}
          onChange={onTargetChange}
        />
        {sameBranch && <p className="text-xs text-err">Source and target are the same branch.</p>}
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t border-line">
        <div className="flex items-baseline gap-1.5 px-3 pt-3 pb-2">
          <h3 className="text-xs font-medium text-ink-2">Queue</h3>
          {queue.length > 0 && <span className="tabular font-mono text-xs text-accent">{queue.length}</span>}
          {queue.length > 1 && <span className="ml-auto text-xs text-ink-3">oldest first</span>}
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="px-3 text-xs text-ink-3">
              <p>Nothing queued.</p>
              <p className="mt-1">Press x on a commit, or use its checkbox. Shift-click selects a range.</p>
            </div>
          ) : (
            <ol>
              {queue.map((commit, index) => {
                const active = progress?.stage === "picking" && progress.commit.sha === commit.sha;
                const conflicted = outcome?.kind === "conflict" && outcome.commit.sha === commit.sha;
                return (
                  <li
                    key={commit.sha}
                    className={clsx(
                      "group flex items-baseline gap-2 border-b border-line/60 py-1.5 pr-1.5 pl-3",
                      active && "bg-hover",
                      conflicted && "shadow-[inset_2px_0_0_var(--color-err)]",
                    )}
                  >
                    <span className="tabular w-4 shrink-0 font-mono text-xs text-accent">{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => onFocus(commit.sha)}
                      className="min-w-0 flex-1 truncate text-left hover:text-ink-2"
                    >
                      {commit.subject}
                    </button>
                    <span className={clsx("shrink-0 font-mono text-xs", conflicted ? "text-err" : "text-ink-3")}>
                      {commit.shortSha}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDequeue(commit.sha)}
                      aria-label={`Remove ${commit.shortSha} from queue`}
                      className="w-5 shrink-0 text-ink-3 hover:text-ink disabled:opacity-0"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      {outcome && <OutcomeNote outcome={outcome} target={target} onDismiss={() => setOutcome(null)} />}

      <section className="space-y-3 border-t border-line p-3">
        <fieldset className="space-y-1.5">
          <legend className="sr-only">Delivery</legend>
          {modes.map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === value}
                onChange={() => setMode(value)}
                className="size-3.5 accent-ink"
              />
              <span className={mode === value ? "text-ink" : "text-ink-2"}>{label}</span>
            </label>
          ))}
        </fieldset>
        {mode === "push" && targetProtected && (
          <p className="text-xs text-warn">{target} is protected. The push may be rejected.</p>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-2">
          <input
            type="checkbox"
            checked={recordOrigin}
            onChange={(e) => setRecordOrigin(e.target.checked)}
            className="size-3.5 accent-ink"
          />
          Add "cherry picked from" line
        </label>

        <Button variant="primary" size="lg" className="w-full" disabled={!canPick} onClick={run}>
          {busy ? progressLabel(progress) : actionLabel(mode, queue.length)}
        </Button>
        <p className="truncate font-mono text-xs text-ink-3">{status}</p>
      </section>

      {askToken && <TokenDialog onClose={() => setAskToken(false)} />}
    </aside>
  );
}

function OutcomeNote({ outcome, target, onDismiss }: { outcome: Outcome; target?: string; onDismiss(): void }) {
  const ok = outcome.kind === "success";
  return (
    <div className={clsx("relative border-t border-line px-3 py-2.5", ok ? "text-ok" : "text-err")}>
      <div className={clsx("border-l-2 pr-6 pl-3", ok ? "border-ok" : "border-err")}>
        {outcome.kind === "success" && (
          <>
            <p className="font-medium text-ink">
              {outcome.result.applied.length === 0
                ? `Nothing to apply. Every change is already in ${target}.`
                : outcome.result.pullRequest
                  ? `Opened #${outcome.result.pullRequest.number}`
                  : `Pushed to ${target}`}
            </p>
            {outcome.result.skipped.length > 0 && (
              <p className="mt-0.5 text-xs text-ink-2">
                {plural(outcome.result.skipped.length, "commit")} skipped (empty after applying).
              </p>
            )}
            {outcome.result.pullRequest && (
              <a
                href={outcome.result.pullRequest.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-block text-xs text-ink-2 underline underline-offset-2 hover:text-ink"
              >
                View pull request ↗
              </a>
            )}
          </>
        )}
        {outcome.kind === "conflict" && (
          <>
            <p className="font-medium text-ink">Conflict in {outcome.commit.shortSha}</p>
            <p className="mt-0.5 text-xs text-ink-2">
              {outcome.commit.subject} doesn't apply cleanly to {target}. Nothing was changed. Remove it from the queue
              or pick it locally.
            </p>
          </>
        )}
        {outcome.kind === "error" && (
          <>
            <p className="font-medium text-ink">Cherry-pick failed</p>
            <p className="mt-0.5 text-xs break-words text-ink-2">{outcome.message}</p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 w-5 text-ink-3 hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}

function actionLabel(mode: DeliveryMode, count: number) {
  if (count === 0) return "Cherry-pick";
  return mode === "push" ? `Push ${plural(count, "commit")}` : `Open pull request (${count})`;
}

function progressLabel(progress: CherryPickProgress | null) {
  switch (progress?.stage) {
    case "picking":
      return `Picking ${progress.index + 1}/${progress.total}`;
    case "finishing":
      return "Finishing";
    default:
      return "Preparing";
  }
}

export function Kbd({ children }: { children: string }) {
  return <kbd className="font-mono text-ink-2">{children}</kbd>;
}
