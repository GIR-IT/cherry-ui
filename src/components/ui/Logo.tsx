/** Two cherries on one stem: two commits from a common parent, one of them picked. */
export function Mark({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0 text-ink"
    >
      <path d="M9 1.75C7.25 4 5.75 7 5 9.5M9 1.75c1.4 2 2.3 4.4 2.5 6.75" />
      <circle cx="4.75" cy="11.75" r="2.75" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="10.75" r="2.75" fill="var(--color-accent)" stroke="none" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Mark />
      <span className="text-[13px] font-semibold tracking-[-0.01em]">Cherry</span>
    </span>
  );
}
