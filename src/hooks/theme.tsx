import { createContext, type ReactNode, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { useLocalStorage } from "./useLocalStorage";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/** Must match the inline script in index.html, which applies the theme before first paint. */
export const THEME_STORAGE_KEY = "cherry.theme";

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function subscribeToSystem(onChange: () => void) {
  const query = darkQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference(preference: ThemePreference): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useLocalStorage<ThemePreference>(THEME_STORAGE_KEY, "system");
  const systemDark = useSyncExternalStore(subscribeToSystem, () => darkQuery().matches);
  const resolved: ResolvedTheme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolved === "dark" ? "#09090b" : "#ffffff");
  }, [resolved]);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
