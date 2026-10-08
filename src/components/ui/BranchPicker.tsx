import { clsx } from "clsx";
import { ChevronDown, Lock } from "lucide-react";
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
export function BranchPicker({
  branches,
  value,
  onChange,
  label,
  defaultBranch,
  disabled,
  className,
}: BranchPickerProps) {
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
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-full items-center gap-2 rounded border border-line-strong px-2 text-left transition-colors hover:bg-hover disabled:opacity-50"
      >
        <span className="shrink-0 text-xs text-ink-3">{label}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] font-medium">{value ?? "choose branch"}</span>
        <ChevronDown className="size-3 shrink-0 text-ink-3" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute top-full right-0 left-0 z-30 mt-1 min-w-64 animate-fade-in overflow-hidden rounded border border-line-strong bg-panel">
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(filtered[active]);
              } else if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Filter branches"
            className="h-8 w-full border-b border-line bg-transparent px-2 font-mono text-[12.5px] outline-none"
          />
          <ul ref={listRef} className="scrollbar-thin max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-2 py-2 text-xs text-ink-3">No branches match</li>}
            {filtered.map((branch, index) => (
              <li key={branch.name} data-index={index}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(branch)}
                  className={clsx(
                    "flex h-7 w-full items-center gap-2 px-2 text-left font-mono text-[12.5px]",
                    index === active && "bg-selected",
                  )}
                >
                  <span className="w-3 shrink-0 text-ink-2">{branch.name === value ? "✓" : ""}</span>
                  <span className="min-w-0 flex-1 truncate">{branch.name}</span>
                  {branch.name === defaultBranch && <span className="font-sans text-xs text-ink-3">default</span>}
                  {branch.isProtected && <Lock className="size-3 shrink-0 text-ink-3" strokeWidth={1.5} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
