/** A 2px indeterminate bar, pinned to the top of its positioned parent. */
export function ProgressBar() {
  return (
    <div role="progressbar" aria-label="Loading" className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
      <div className="h-full w-2/5 animate-indeterminate bg-ink/30" />
    </div>
  );
}
