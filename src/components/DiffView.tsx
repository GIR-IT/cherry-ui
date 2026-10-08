import { parsePatchFiles } from "@pierre/diffs";
import { CodeView, type CodeViewItem } from "@pierre/diffs/react";
import { clsx } from "clsx";
import { Columns2, Copy, ExternalLink, Rows2 } from "lucide-react";
import { useMemo } from "react";
import { useCommitDiff } from "../hooks/github";
import { useTheme } from "../hooks/theme";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { fullDate, plural } from "../lib/format";
import type { Commit } from "../lib/github";
import { Avatar } from "./ui/Avatar";
import { Spinner } from "./ui/Spinner";
import { useToast } from "./ui/Toast";

type DiffStyle = "split" | "unified";

export function DiffView({ owner, repo, commit }: { owner: string; repo: string; commit?: Commit }) {
  const diff = useCommitDiff(owner, repo, commit?.sha);
  const [diffStyle, setDiffStyle] = useLocalStorage<DiffStyle>("cherry.diff-style", "unified");
  const toast = useToast();
  const { resolved: theme } = useTheme();

  const { items, additions, deletions } = useMemo(() => summarize(diff.data, commit?.sha), [diff.data, commit?.sha]);

  if (!commit)
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Select a commit to see its changes
      </div>
    );

  const body = commit.message.slice(commit.subject.length).trim();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-200/80 px-6 pt-5 pb-4 dark:border-zinc-800">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-snug font-semibold text-balance">{commit.subject}</h2>
            {body && <p className="mt-2 line-clamp-4 text-sm whitespace-pre-line text-zinc-500">{body}</p>}
          </div>
          <div className="flex shrink-0 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-900">
            {(["unified", "split"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setDiffStyle(style)}
                title={style === "split" ? "Side by side" : "Unified"}
                className={clsx(
                  "flex size-7 items-center justify-center rounded-md transition",
                  diffStyle === style
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-400 hover:text-zinc-700",
                )}
              >
                {style === "split" ? <Columns2 className="size-3.5" /> : <Rows2 className="size-3.5" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Avatar name={commit.authorName} src={commit.avatarUrl} size={16} />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{commit.authorName}</span>
          </span>
          <span>{fullDate(commit.date)}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(commit.sha);
              toast("Commit SHA copied", "success");
            }}
            className="flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {commit.shortSha} <Copy className="size-3" />
          </button>
          <a
            href={commit.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-cherry-600"
          >
            GitHub <ExternalLink className="size-3" />
          </a>
          {diff.data && (
            <span className="ml-auto flex items-center gap-2 font-mono">
              <span>{plural(items.length, "file")}</span>
              <span className="text-emerald-600">+{additions}</span>
              <span className="text-cherry-600">−{deletions}</span>
            </span>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {diff.isPending && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400">
            <Spinner /> Loading diff…
          </div>
        )}
        {diff.isError && <div className="p-6 text-sm text-cherry-600">{diff.error.message}</div>}
        {diff.data && items.length === 0 && (
          <div className="p-6 text-sm text-zinc-400">This commit has no file changes.</div>
        )}
        {items.length > 0 && (
          <CodeView
            key={commit.sha}
            items={items}
            className="scrollbar-thin h-full overflow-auto"
            options={{ diffStyle, themeType: theme, stickyHeaders: true, overflow: "scroll" }}
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
