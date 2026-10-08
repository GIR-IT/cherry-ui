import { ExternalLink, KeyRound, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { useGitHub } from "../hooks/github";
import { Button } from "./ui/Button";

const FINE_GRAINED_URL =
  "https://github.com/settings/personal-access-tokens/new?name=Cherry&description=Cherry-pick+commits+and+open+pull+requests&expires_in=90&contents=write&pull_requests=write";
const CLASSIC_URL = "https://github.com/settings/tokens/new?description=Cherry&scopes=repo&default_expires_at=90";

export function TokenDialog({ onClose }: { onClose(): void }) {
  const { token, setToken } = useGitHub();
  const [value, setValue] = useState(token ?? "");

  function save() {
    setToken(value);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm" onPointerDown={onClose}>
      <div onPointerDown={(e) => e.stopPropagation()} className="w-full max-w-lg animate-slide-up rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-cherry-50 text-cherry-600 dark:bg-cherry-950/60 dark:text-cherry-400">
            <KeyRound className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold">GitHub access</h2>
            <p className="mt-0.5 text-sm text-zinc-500">Needed for private repos and to cherry-pick. Public repos can be browsed without it.</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <ol className="mb-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <li className="flex gap-2">
            <span className="font-mono text-cherry-600">1</span>
            <span>
              <a href={FINE_GRAINED_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-cherry-600 underline-offset-2 hover:underline">
                Create a fine-grained token <ExternalLink className="size-3" />
              </a>{" "}
              with <b>Contents</b> and <b>Pull requests</b> set to read &amp; write, or a{" "}
              <a href={CLASSIC_URL} target="_blank" rel="noreferrer" className="text-cherry-600 underline-offset-2 hover:underline">classic token</a> with <code className="font-mono text-xs">repo</code> scope.
              Picking commits that touch <code className="font-mono text-xs">.github/workflows</code> also needs <b>Workflows</b> write access.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-cherry-600">2</span>
            <span>Paste it below.</span>
          </li>
        </ol>

        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="github_pat_…"
          className="h-10 w-full rounded-lg bg-zinc-50 px-3 font-mono text-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-cherry-500 dark:bg-zinc-950 dark:ring-zinc-800"
        />

        <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          Stored only in this browser's localStorage and sent only to api.github.com.
        </p>

        <div className="mt-6 flex justify-between gap-2">
          {token ? <Button variant="danger" onClick={() => { setToken(null); onClose(); }}>Remove token</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={!value.trim()}>Save token</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
