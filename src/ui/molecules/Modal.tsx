import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink-primary/45"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-xl bg-surface-2 px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-muted" />
        <h2 className="mb-4 text-lg font-bold tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  );
}
