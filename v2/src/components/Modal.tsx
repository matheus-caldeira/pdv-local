import { type ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

export function Modal({ open, onClose, title, children, width = '440px' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28, 27, 26, 0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          width: '100%',
          maxWidth: width,
          maxHeight: '85dvh',
          overflowY: 'auto',
          padding: 'var(--space-6) var(--space-5)',
          paddingBottom: 'calc(var(--space-6) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: 'var(--ink-muted)',
            borderRadius: 'var(--radius-full)',
            margin: '0 auto var(--space-4)',
          }}
        />
        <h2
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--weight-bold)',
            marginBottom: 'var(--space-4)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
