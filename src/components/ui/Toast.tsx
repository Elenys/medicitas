'use client';

import { CheckCircle2, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
}
interface ToastContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback(
    (id: number) => setItems((list) => list.filter((t) => t.id !== id)),
    [],
  );
  const push = useCallback(
    (kind: ToastItem['kind'], message: string) => {
      const id = Date.now() + Math.random();
      setItems((list) => [...list, { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );
  const value = useMemo<ToastContextValue>(
    () => ({ showSuccess: (m) => push('success', m), showError: (m) => push('error', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'shadow-modal pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border px-4 py-3',
              t.kind === 'success'
                ? 'border-success bg-success-light text-success-dark'
                : 'border-danger bg-danger-light text-danger-darker',
            )}
          >
            {t.kind === 'success' ? (
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" />
            ) : (
              <XCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
            )}
            <p className="flex-1 text-sm">{t.message}</p>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(t.id)}
              className="rounded p-1 hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
