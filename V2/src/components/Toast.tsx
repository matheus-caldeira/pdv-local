import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastState {
  message: string
  type: ToastType
  visible: boolean
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', visible: false })

  const show = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true })
  }, [])

  useEffect(() => {
    if (!toast.visible) return
    const timer = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500)
    return () => clearTimeout(timer)
  }, [toast.visible, toast.message])

  const bgColor = toast.type === 'error' ? 'var(--danger)'
    : toast.type === 'success' ? 'var(--success)'
    : 'var(--cardapio-bg)'

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: `translateX(-50%) translateY(${toast.visible ? '0' : '-20px'})`,
          background: bgColor,
          color: '#fff',
          padding: '10px 24px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-semibold)',
          zIndex: 9999,
          opacity: toast.visible ? 1 : 0,
          transition: 'all var(--duration-normal) var(--ease-out)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {toast.message}
      </div>
    </ToastContext.Provider>
  )
}
