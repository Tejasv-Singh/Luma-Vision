import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { makeId } from '@/utils/format';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  /** Optional inline action, e.g. "Retry" or "Undo". */
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = makeId('toast');
      const duration = toast.durationMs ?? (toast.kind === 'error' ? 7000 : 4200);
      // Oldest toasts drop off the top so the stack never grows unbounded.
      setToasts((current) => [...current, { ...toast, id }].slice(-MAX_VISIBLE));
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      dismiss,
      success: (title, description) => push({ kind: 'success', title, ...(description ? { description } : {}) }),
      error: (title, description) => push({ kind: 'error', title, ...(description ? { description } : {}) }),
      info: (title, description) => push({ kind: 'info', title, ...(description ? { description } : {}) }),
      warning: (title, description) => push({ kind: 'warning', title, ...(description ? { description } : {}) }),
    }),
    [dismiss, push, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.');
  return ctx;
}

const KIND_STYLES: Record<ToastKind, { border: string; icon: string; glyph: string }> = {
  success: { border: 'border-positive/40', icon: 'text-positive', glyph: '✓' },
  error: { border: 'border-negative/45', icon: 'text-negative', glyph: '!' },
  warning: { border: 'border-caution/45', icon: 'text-caution', glyph: '⚠' },
  info: { border: 'border-gold-500/40', icon: 'text-gold-500', glyph: 'i' },
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => {
        const style = KIND_STYLES[toast.kind];
        return (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl border bg-navy-900/95',
              'px-4 py-3 shadow-panel backdrop-blur',
              style.border,
            )}
          >
            <span
              aria-hidden
              className={cn(
                'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current text-[11px] font-bold',
                style.icon,
              )}
            >
              {style.glyph}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-100">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{toast.description}</p>
              )}
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss(toast.id);
                  }}
                  className="mt-2 text-xs font-semibold text-gold-500 underline-offset-2 hover:underline"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded p-0.5 text-ink-500 transition-colors hover:text-ink-200"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
