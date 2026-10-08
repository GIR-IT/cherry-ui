import { clsx } from "clsx";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: ReactNode;
}

const ToastContext = createContext<(message: ReactNode, kind?: ToastKind) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const icons = { success: CheckCircle2, error: CircleAlert, info: Info };
const tones = { success: "text-emerald-500", error: "text-cherry-500", info: "text-sky-500" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message: ReactNode, kind: ToastKind = "info") => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((toast) => {
          const Icon = icons[toast.kind];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-lg ring-1 shadow-zinc-900/10 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
            >
              <Icon className={clsx("mt-px size-4 shrink-0", tones[toast.kind])} />
              <div className="min-w-0 flex-1 text-zinc-700 dark:text-zinc-200">{toast.message}</div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
