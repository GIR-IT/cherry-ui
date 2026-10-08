import { clsx } from "clsx";
import { Check, ChevronsUpDown, GitBranch, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Branch } from "../../lib/github";

interface BranchPickerProps {
  branches: Branch[];
  value?: string;
  onChange(branch: string): void;
  label: string;
  defaultBranch?: string;
  disabled?: boolean;
  className?: string;
}

/** Searchable branch selector with keyboard navigation. */
export function BranchPicker({ branches, value, onChange, label, defaultBranch, disabled, className }: BranchPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? branches.filter((b) => b.name.toLowerCase().includes(q)) : branches;
    return [...matches].sort((a, b) => Number(b.name === defaultBranch) - Number(a.name === defaultBranch));
  }, [branches, query, defaultBranch]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(branch: Branch | undefined) {
    if (!branch) return;
    onChange(branch.name);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="group flex h-9 w-full items-center gap-2 rounded-lg bg-white px-3 text-left text-sm ring-1 ring-zinc-200 transition hover:ring-zinc-300 disabled:opacity-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:ring-zinc-700"
      >
        <GitBranch className="size-3.5 shrink-0 text-zinc-400" />
        <span className="shrink-0 text-xs text-zinc-400">{label}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium">{value ?? "Choose branch"}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute top-full right-0 left-0 z-30 mt-1.5 min-w-64 animate-fade-in overflow-hidden rounded-xl bg-white shadow-xl ring-1 shadow-zinc-900/10 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); choose(filtered[active]); }
              else if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Find a branch…"
            className="w-full border-b border-zinc-100 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-zinc-400 dark:border-zinc-800"
          />
          <ul ref={listRef} className="scrollbar-thin max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-400">No branches match</li>}
            {filtered.map((branch, index) => (
              <li key={branch.name} data-index={index}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(branch)}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px]",
                    index === active && "bg-zinc-100 dark:bg-zinc-800",
                  )}
                >
                  <Check className={clsx("size-3.5 shrink-0 text-cherry-600", branch.name !== value && "invisible")} />
                  <span className="min-w-0 flex-1 truncate font-mono">{branch.name}</span>
                  {branch.name === defaultBranch && <span className="rounded bg-zinc-100 px-1.5 py-px text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800">default</span>}
                  {branch.isProtected && <Lock className="size-3 shrink-0 text-zinc-400" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
