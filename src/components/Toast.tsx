import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from '@/lib/toast-context'
import type { ToastAction, ToastType } from '@/lib/toast-context'
import { useLang } from '@/lib/lang-context'

interface ToastItem {
  id: number
  type: ToastType
  message: string
  action?: ToastAction
}

const ACCENTS: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-sky-400',
}

const GLYPHS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

function dismissDelay(type: ToastType): number {
  return type === 'error' ? 8000 : 5000
}

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: () => void
}) {
  const { t } = useLang()
  const [paused, setPaused] = useState(false)
  const remainingRef = useRef(dismissDelay(toast.type))
  const startedRef = useRef(0)
  const timerRef = useRef(0)
  const dismissRef = useRef(onDismiss)

  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (paused) return
    startedRef.current = Date.now()
    timerRef.current = window.setTimeout(() => dismissRef.current(), remainingRef.current)
    return () => window.clearTimeout(timerRef.current)
  }, [paused])

  function pause() {
    if (paused) return
    setPaused(true)
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedRef.current))
  }

  function resume() {
    setPaused(false)
  }

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) resume()
      }}
      className="glass-strong pointer-events-auto flex w-full max-w-sm animate-rise items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]"
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ACCENTS[toast.type]}`}
      >
        {GLYPHS[toast.type]}
      </span>
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick()
            onDismiss()
          }}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/10"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('common.dismiss')}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-dim2 transition-colors hover:bg-surface2 hover:text-soft"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const pushToast = useCallback(
    (type: ToastType, message: string, action?: ToastAction) => {
      const id = ++counter.current
      setToasts((prev) => [...prev.slice(-2), { id, type, message, action }])
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-32 z-50 flex flex-col items-center gap-2 px-4 md:bottom-10">
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
