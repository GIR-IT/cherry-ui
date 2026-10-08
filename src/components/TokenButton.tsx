import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useGitHub, useViewer } from "../hooks/github";
import { TokenDialog } from "./TokenDialog";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";

export function TokenButton() {
  const { token } = useGitHub();
  const viewer = useViewer();
  const [open, setOpen] = useState(false);

  return (
    <>
      {token && viewer.data ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title="GitHub token"
        >
          <Avatar name={viewer.data.login} src={viewer.data.avatarUrl} size={22} />
          <span className="font-medium">{viewer.data.login}</span>
        </button>
      ) : (
        <Button variant={token && viewer.isError ? "danger" : "secondary"} onClick={() => setOpen(true)}>
          <KeyRound className="size-3.5" />
          {token && viewer.isError ? "Token invalid" : "Add token"}
        </Button>
      )}
      {open && <TokenDialog onClose={() => setOpen(false)} />}
    </>
  );
}
