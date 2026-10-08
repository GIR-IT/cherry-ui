import { clsx } from "clsx";
import { Check, CheckCheck } from "lucide-react";
import { memo } from "react";
import { timeAgo } from "../lib/format";
import type { Commit } from "../lib/github";
import { Avatar } from "./ui/Avatar";

interface CommitListProps {
  commits: Commit[];
  applied: Set<string>;
  queued: Set<string>;
  focused?: string;
  onFocus(sha: string): void;
  onToggle(sha: string, extendRange: boolean): void;
}

export function CommitList({ commits, applied, queued, focused, onFocus, onToggle }: CommitListProps) {
  return (
    <ul className="space-y-px px-2 pb-3">
      {commits.map((commit) => (
        <CommitRow
          key={commit.sha}
          commit={commit}
          isApplied={applied.has(commit.sha)}
          isQueued={queued.has(commit.sha)}
          isFocused={focused === commit.sha}
          onFocus={onFocus}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

interface CommitRowProps {
  commit: Commit;
  isApplied: boolean;
  isQueued: boolean;
  isFocused: boolean;
  onFocus(sha: string): void;
  onToggle(sha: string, extendRange: boolean): void;
}

const CommitRow = memo(function CommitRow({ commit, isApplied, isQueued, isFocused, onFocus, onToggle }: CommitRowProps) {
  const isMerge = commit.parents.length > 1;

  return (
    <li data-sha={commit.sha}>
      <div
        role="button"
        tabIndex={-1}
        onClick={() => onFocus(commit.sha)}
        className={clsx(
          "group relative flex cursor-pointer items-start gap-3 rounded-lg py-2 pr-2.5 pl-2 transition-colors outline-none",
          isFocused ? "bg-zinc-100 dark:bg-zinc-800/80" : "hover:bg-zinc-50 dark:hover:bg-zinc-900",
          isQueued && !isFocused && "bg-cherry-50/60 dark:bg-cherry-950/25",
        )}
      >
        {isFocused && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cherry-500" />}

        <button
          type="button"
          disabled={isMerge}
          aria-label={isQueued ? "Remove from queue" : "Add to queue"}
          title={isMerge ? "Merge commits can't be cherry-picked" : "Queue (shift-click for a range)"}
          onClick={(e) => { e.stopPropagation(); onToggle(commit.sha, e.shiftKey); }}
          className={clsx(
            "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] ring-[1.5px] transition",
            isQueued
              ? "bg-cherry-600 ring-cherry-600 text-white"
              : isApplied
                ? "bg-emerald-500/90 ring-emerald-500/90 text-white"
                : "ring-zinc-300 hover:ring-cherry-400 dark:ring-zinc-700",
            isMerge && "cursor-not-allowed opacity-30",
          )}
        >
          {(isQueued || isApplied) && <Check className="size-3" strokeWidth={3} />}
        </button>

        <div className={clsx("min-w-0 flex-1", isApplied && !isQueued && "opacity-55")}>
          <p className="truncate text-[13.5px] leading-5 font-medium">{commit.subject}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
            <Avatar name={commit.authorName} src={commit.avatarUrl} size={14} />
            <span className="truncate">{commit.authorLogin ?? commit.authorName}</span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span className="shrink-0" title={commit.date}>{timeAgo(commit.date)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">{commit.shortSha}</code>
          {isApplied && (
            <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400" title="Already in the target branch">
              <CheckCheck className="size-3" /> in target
            </span>
          )}
          {isMerge && <span className="text-[10.5px] text-zinc-400">merge</span>}
        </div>
      </div>
    </li>
  );
});
