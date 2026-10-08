import { clsx } from "clsx";

const palette = ["#e11d48", "#f97316", "#d97706", "#16a34a", "#0d9488", "#0284c7", "#4f46e5", "#9333ea", "#c026d3", "#db2777"];

function colorFor(name: string) {
  let hash = 17;
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function Avatar({ name, src, size = 24, className }: { name: string; src?: string; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (src)
    return <img src={`${src}${src.includes("?") ? "&" : "?"}s=${size * 2}`} alt="" style={style} className={clsx("shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800", className)} />;

  const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span
      style={{ ...style, background: colorFor(name), fontSize: size * 0.4 }}
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
    >
      {initials}
    </span>
  );
}
