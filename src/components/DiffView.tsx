import { parsePatchFiles } from "@pierre/diffs";
import { CodeView, type CodeViewItem } from "@pierre/diffs/react";
import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { useCommitDiff } from "../hooks/github";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { timeAgo } from "../lib/format";
import type { Commit } from "../lib/github";
import { Button } from "./ui/Button";
import { ProgressBar } from "./ui/ProgressBar";

type DiffStyle = "split" | "unified";

export function DiffView({ owner, repo, commit }: { owner: string; repo: string; commit?: Commit }) {
  const diff = useCommitDiff(owner, repo, commit);
  const [diffStyle, setDiffStyle] = useLocalStorage<DiffStyle>("cherry.diff-style", "unified");
  const [copied, setCopied] = useState(false);

  const { items, additions, deletions } = useMemo(() => summarize(diff.data, commit?.sha), [diff.data, commit?.sha]);

  if (!commit) return <p className="p-4 text-ink-3">Select a commit to see its diff.</p>;

  const body = commit.message.slice(commit.subject.length).trim();

  function copySha() {
    if (!commit) return;
    void navigator.clipboard.writeText(commit.sha);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base leading-[22px] font-semibold tracking-[-0.01em]">{commit.subject}</h2>
        {body && <p className="mt-1 line-clamp-4 whitespace-pre-line text-ink-2">{body}</p>}
        {commit.parents.length > 1 && (
          <p className="mt-1 text-xs text-ink-3">
            Merge commit. Showing its changes against the first parent, which is what a cherry-pick applies.
          </p>
        )}

        <div className="mt-2 flex items-center gap-4 font-mono text-xs text-ink-3">
          <button type="button" onClick={copySha} className="hover:text-ink" title="Copy full SHA">
            {copied ? "copied" : commit.shortSha}
          </button>
          <span className="truncate">{commit.authorLogin ?? commit.authorName}</span>
          <span className="shrink-0" title={commit.date}>
            {timeAgo(commit.date)}
          </span>
          {diff.data && (
            <span className="tabular shrink-0">
              <span className="text-ok">+{additions}</span> <span className="text-err">−{deletions}</span>
            </span>
          )}
          <a href={commit.htmlUrl} target="_blank" rel="noreferrer" className="shrink-0 hover:text-ink">
            GitHub ↗
          </a>
          <span className="ml-auto flex shrink-0 gap-3 font-sans">
            {(["split", "unified"] as const).map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={diffStyle === style}
                onClick={() => setDiffStyle(style)}
                className={clsx(
                  "capitalize underline-offset-4",
                  diffStyle === style ? "text-ink underline decoration-line-strong" : "hover:text-ink-2",
                )}
              >
                {style}
              </button>
            ))}
          </span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {diff.isPending && (
          <>
            <ProgressBar />
            <p className="p-4 font-mono text-xs text-ink-3">Loading diff...</p>
          </>
        )}
        {diff.isError && (
          <div className="flex items-center gap-3 p-4">
            <p className="text-err">{diff.error.message}</p>
            <Button size="sm" variant="ghost" onClick={() => void diff.refetch()}>
              Retry
            </Button>
          </div>
        )}
        {diff.data && items.length === 0 && <p className="p-4 text-ink-3">No file changes in this commit.</p>}
        {items.length > 0 && (
          <CodeView
            key={commit.sha}
            items={items}
            className="scrollbar-thin h-full overflow-auto"
            options={{ diffStyle, themeType: "dark", stickyHeaders: true, overflow: "scroll" }}
          />
        )}
      </div>
    </div>
  );
}

function summarize(patch: string | undefined, sha: string | undefined) {
  if (!patch || !sha) return { items: [] as CodeViewItem<undefined>[], additions: 0, deletions: 0 };

  let additions = 0;
  let deletions = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }

  const files = parsePatchFiles(patch, sha).flatMap((p) => p.files);
  const items: CodeViewItem<undefined>[] = files.map((fileDiff, index) => ({
    id: `${sha}:${index}:${fileDiff.name}`,
    type: "diff",
    fileDiff,
  }));
  return { items, additions, deletions };
}
