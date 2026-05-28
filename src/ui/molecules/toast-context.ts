import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export const ToastContext = createContext<
  (message: string, type?: ToastType) => void
>(() => {});

export function useToast() {
  return useContext(ToastContext);
}
