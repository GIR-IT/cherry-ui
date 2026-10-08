import { clsx } from "clsx";
import { memo } from "react";
import { timeAgo } from "../lib/format";
import type { Commit } from "../lib/github";

interface CommitListProps {
  commits: Commit[];
  applied: Set<string>;
  queued: Set<string>;
  focused?: string;
  target?: string;
  onFocus(sha: string): void;
  onToggle(sha: string, extendRange: boolean): void;
}

export function CommitList({ commits, applied, queued, focused, target, onFocus, onToggle }: CommitListProps) {
  return (
    <ul>
      {commits.map((commit) => (
        <CommitRow
          key={commit.sha}
          commit={commit}
          isApplied={applied.has(commit.sha)}
          isQueued={queued.has(commit.sha)}
          isFocused={focused === commit.sha}
          target={target}
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
  target?: string;
  onFocus(sha: string): void;
  onToggle(sha: string, extendRange: boolean): void;
}

const CommitRow = memo(function CommitRow({
  commit,
  isApplied,
  isQueued,
  isFocused,
  target,
  onFocus,
  onToggle,
}: CommitRowProps) {
  const isMerge = commit.parents.length > 1;
  const muted = isApplied && !isQueued;

  return (
    <li data-sha={commit.sha}>
      <div
        onClick={() => onFocus(commit.sha)}
        className={clsx(
          "flex cursor-default items-start gap-3 border-b border-line/60 py-2 pr-3 pl-3",
          isFocused ? "bg-selected" : isQueued ? "bg-accent-wash" : "hover:bg-hover",
          isQueued
            ? "shadow-[inset_2px_0_0_var(--color-accent)]"
            : isFocused && "shadow-[inset_2px_0_0_var(--color-ink)]",
        )}
      >
        <span className="mt-[3px] flex size-3.5 shrink-0 items-center justify-center">
          {isApplied && !isQueued ? (
            <span className="font-mono text-xs text-ok" title={`Already in ${target}`}>
              ✓
            </span>
          ) : (
            <button
              type="button"
              aria-label={isQueued ? "Remove from queue" : "Add to queue"}
              aria-pressed={isQueued}
              title="Queue (shift-click for a range)"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(commit.sha, e.shiftKey);
              }}
              className={clsx(
                "flex size-3.5 items-center justify-center rounded-[3px] border transition-colors",
                isQueued ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-ink-3",
              )}
            >
              {isQueued && (
                <svg
                  viewBox="0 0 10 10"
                  className="size-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  aria-hidden="true"
                >
                  <path d="M2 5.2 4.1 7.3 8 2.8" />
                </svg>
              )}
            </button>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <p className={clsx("min-w-0 flex-1 truncate font-medium", muted ? "text-ink-3" : "text-ink")}>
              {commit.subject}
            </p>
            {isApplied && !isQueued ? (
              <span className="shrink-0 text-xs text-ok">in {target}</span>
            ) : (
              <span className="shrink-0 font-mono text-xs text-ink-3">{commit.shortSha}</span>
            )}
          </div>
          <p className="truncate text-xs text-ink-3">
            {commit.authorLogin ?? commit.authorName} · {timeAgo(commit.date)}
            {isMerge && <span title="Picked against its first parent (git cherry-pick -m 1)"> · merge</span>}
          </p>
        </div>
      </div>
    </li>
  );
});
