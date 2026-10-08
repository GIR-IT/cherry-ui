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
        <Button variant="ghost" onClick={() => setOpen(true)} title="GitHub token">
          <Avatar name={viewer.data.login} src={viewer.data.avatarUrl} />
          <span className="text-ink">{viewer.data.login}</span>
        </Button>
      ) : (
        <Button variant={token && viewer.isError ? "danger" : "ghost"} onClick={() => setOpen(true)}>
          {token && viewer.isError ? "Token invalid" : "Add token"}
        </Button>
      )}
      {open && <TokenDialog onClose={() => setOpen(false)} />}
    </>
  );
}
