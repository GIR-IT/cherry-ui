import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover disabled:bg-hover disabled:text-ink-3",
  secondary: "border border-line-strong bg-canvas text-ink hover:bg-hover disabled:opacity-50",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink disabled:opacity-50",
  danger: "text-err hover:bg-err/10 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  sm: "h-6 gap-1 px-2 text-xs",
  md: "h-7 gap-1.5 px-2.5 text-[13px]",
  lg: "h-8 gap-1.5 px-3 text-[13px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex shrink-0 select-none items-center justify-center rounded font-medium transition-colors disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
