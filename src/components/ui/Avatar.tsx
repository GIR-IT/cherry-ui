import { clsx } from "clsx";

export function Avatar({
  name,
  src,
  size = 18,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (src)
    return (
      <img
        src={`${src}${src.includes("?") ? "&" : "?"}s=${size * 2}`}
        alt=""
        style={style}
        className={clsx("shrink-0 rounded-full bg-selected", className)}
      />
    );
  return (
    <span
      style={{ ...style, fontSize: size * 0.5 }}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-selected font-medium text-ink-2",
        className,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
