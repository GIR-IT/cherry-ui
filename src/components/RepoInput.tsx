import { clsx } from "clsx";
import { useState } from "react";
import { parseRepoInput, type RepoRoute } from "../lib/route";
import { Button } from "./ui/Button";

interface RepoInputProps {
  initial?: string;
  onOpen(route: RepoRoute): void;
  onCancel?(): void;
  autoFocus?: boolean;
  className?: string;
}

export function RepoInput({ initial = "", onOpen, onCancel, autoFocus, className }: RepoInputProps) {
  const [value, setValue] = useState(initial);
  const [invalid, setInvalid] = useState(false);

  function submit() {
    const route = parseRepoInput(value);
    setInvalid(!route);
    if (route) onOpen(route);
  }

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div
        className={clsx(
          "flex h-10 items-center gap-2 rounded border pr-1.5 pl-3 transition-colors focus-within:border-ink",
          invalid ? "border-err" : "border-line-strong",
        )}
      >
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setInvalid(false);
          }}
          onKeyDown={(e) => e.key === "Escape" && onCancel?.()}
          placeholder="github.com/owner/repo or a compare URL"
          spellCheck={false}
          aria-label="GitHub repository or URL"
          aria-invalid={invalid}
          className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none"
        />
        <Button type="submit" variant="secondary" size="md">
          Open ↵
        </Button>
      </div>
      {invalid && <p className="mt-2 text-xs text-err">That doesn't look like a GitHub repository.</p>}
    </form>
  );
}
