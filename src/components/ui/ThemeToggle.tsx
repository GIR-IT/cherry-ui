import { clsx } from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";
import { type ThemePreference, useTheme } from "../../hooks/theme";

const options: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System theme", Icon: Monitor },
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "dark", label: "Dark theme", Icon: Moon },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <fieldset aria-label="Theme" className="flex rounded-lg border-0 bg-zinc-100 p-0.5 dark:bg-zinc-900">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={preference === value}
          aria-label={label}
          title={label}
          onClick={() => setPreference(value)}
          className={clsx(
            "flex size-7 items-center justify-center rounded-md transition",
            preference === value
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </fieldset>
  );
}
