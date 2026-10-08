import { useEffect, useState } from "react";
import { useGitHub } from "../hooks/github";
import { Button } from "./ui/Button";

const FINE_GRAINED_URL =
  "https://github.com/settings/personal-access-tokens/new?name=Cherry&description=Cherry-pick+commits+and+open+pull+requests&expires_in=90&contents=write&pull_requests=write";
const CLASSIC_URL = "https://github.com/settings/tokens/new?description=Cherry&scopes=repo&default_expires_at=90";

const link = "text-ink underline underline-offset-2 hover:text-accent";

export function TokenDialog({ onClose }: { onClose(): void }) {
  const { token, setToken } = useGitHub();
  const [value, setValue] = useState(token ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    setToken(value);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex animate-fade-in items-start justify-center bg-black/50 px-4 pt-[18vh]"
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-title"
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-md border border-line-strong bg-panel p-5"
      >
        <h2 id="token-title" className="text-base font-semibold tracking-[-0.01em]">
          GitHub token
        </h2>
        <p className="mt-1 text-ink-2">
          Needed for private repos and for cherry-picking. Public repos can be browsed without one.
        </p>

        <ol className="mt-4 list-decimal space-y-1.5 pl-4 text-ink-2 marker:text-ink-3">
          <li>
            Create a{" "}
            <a href={FINE_GRAINED_URL} target="_blank" rel="noreferrer" className={link}>
              fine-grained token
            </a>{" "}
            with Contents and Pull requests set to read &amp; write, or a{" "}
            <a href={CLASSIC_URL} target="_blank" rel="noreferrer" className={link}>
              classic token
            </a>{" "}
            with <code className="font-mono text-xs">repo</code> scope. Commits touching{" "}
            <code className="font-mono text-xs">.github/workflows</code> also need Workflows write.
          </li>
          <li>Paste it here.</li>
        </ol>

        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="github_pat_…"
          aria-label="GitHub token"
          className="mt-4 h-8 w-full rounded border border-line-strong bg-transparent px-2.5 font-mono text-[13px] outline-none transition-colors focus:border-ink"
        />
        <p className="mt-2 text-xs text-ink-3">Stored in this browser's localStorage. Sent only to api.github.com.</p>

        <div className="mt-5 flex items-center gap-2">
          {token && (
            <Button
              variant="danger"
              onClick={() => {
                setToken(null);
                onClose();
              }}
            >
              Remove token
            </Button>
          )}
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!value.trim()}>
            Save token
          </Button>
        </div>
      </div>
    </div>
  );
}
