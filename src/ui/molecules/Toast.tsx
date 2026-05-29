import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { ToastContext, type ToastType } from './toast-context';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

const bgByType: Record<ToastType, string> = {
  error: 'bg-danger',
  success: 'bg-success',
  info: 'bg-cardapio-bg',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    visible: false,
  });

  const show = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true });
  }, []);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(
      () => setToast((current) => ({ ...current, visible: false })),
      2500,
    );
    return () => clearTimeout(timer);
  }, [toast.visible, toast.message]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        className={cn(
          'pointer-events-none fixed left-1/2 top-5 z-[9999] -translate-x-1/2 whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-semibold text-accent-text transition-all',
          bgByType[toast.type],
          toast.visible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-5 opacity-0',
        )}
      >
        {toast.message}
      </div>
    </ToastContext.Provider>
  );
}
