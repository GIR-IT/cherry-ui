import { clsx } from "clsx";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { parseRepoInput, type RepoRoute } from "../lib/route";

interface RepoInputProps {
  initial?: string;
  onOpen(route: RepoRoute): void;
  size?: "md" | "lg";
  autoFocus?: boolean;
}

export function RepoInput({ initial = "", onOpen, size = "md", autoFocus }: RepoInputProps) {
  const [value, setValue] = useState(initial);
  const [invalid, setInvalid] = useState(false);
  const large = size === "lg";

  function submit() {
    const route = parseRepoInput(value);
    setInvalid(!route);
    if (route) onOpen(route);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={clsx(
        "group flex items-center gap-2 bg-white ring-1 transition focus-within:ring-2 dark:bg-zinc-900",
        invalid ? "ring-cherry-400" : "ring-zinc-200 focus-within:ring-cherry-500 dark:ring-zinc-800",
        large ? "h-14 rounded-2xl pr-2 pl-5 shadow-lg shadow-zinc-900/5" : "h-9 rounded-lg pr-1 pl-3",
      )}
    >
      <Search className={clsx("shrink-0 text-zinc-400", large ? "size-5" : "size-3.5")} />
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
        }}
        placeholder={large ? "Paste a GitHub repo, branch or compare URL" : "owner/repo"}
        spellCheck={false}
        className={clsx(
          "min-w-0 flex-1 bg-transparent font-mono outline-none placeholder:font-sans placeholder:text-zinc-400",
          large ? "text-base" : "text-[13px]",
        )}
      />
      <button
        type="submit"
        aria-label="Open"
        className={clsx(
          "flex shrink-0 items-center justify-center rounded-lg transition",
          large
            ? "size-10 bg-cherry-600 text-white hover:bg-cherry-700"
            : "size-7 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
        )}
      >
        <ArrowRight className={large ? "size-5" : "size-3.5"} />
      </button>
    </form>
  );
}
