import { clsx } from "clsx";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: ReactNode;
}

const ToastContext = createContext<(message: ReactNode, kind?: ToastKind) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const dots: Record<ToastKind, string> = { success: "bg-ok", error: "bg-err", info: "bg-ink-3" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message: ReactNode, kind: ToastKind = "info") => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <output aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="group pointer-events-auto flex animate-fade-in items-center gap-2.5 rounded border border-line-strong bg-panel px-3 py-2"
          >
            <span className={clsx("size-1.5 shrink-0 rounded-full", dots[toast.kind])} />
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.kind === "error" && (
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-xs text-ink-3 opacity-0 transition group-hover:opacity-100 hover:text-ink"
              >
                Dismiss
              </button>
            )}
          </div>
        ))}
      </output>
    </ToastContext.Provider>
  );
}
