import { useId, useRef, useState } from 'react'
import { useModalFocus } from '@/hooks/useModalFocus'
import { useLang } from '@/lib/lang-context'

export interface ConfirmRequest {
  title: string
  message?: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
}

interface DialogProps extends ConfirmRequest {
  onCancel: () => void
}

export function Dialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: DialogProps) {
  const [busy, setBusy] = useState(false)
  const { t } = useLang()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useModalFocus({ onClose: onCancel, panelRef, initialFocusRef: cancelRef })

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
    } catch {
      // La página ya mostró el error (toast); el diálogo queda abierto para
      // reintentar sin tirar una promesa sin manejar.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="ui-card w-full max-w-sm animate-rise overscroll-contain rounded-t-2xl p-5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.8)] [clip-path:none] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="font-semibold">{title}</h2>
        {message && <p className="mt-2 text-sm text-dim">{message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-12 rounded-xl border border-edge2 bg-surface2 px-4 py-3 text-sm font-medium text-soft transition-[color,background-color,border-color,transform] duration-200 hover:text-strong disabled:opacity-50 active:scale-[0.98]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            aria-busy={busy}
            className={`min-h-12 rounded-xl px-4 py-3 text-sm font-semibold text-neutral-950 transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.98] disabled:opacity-50 ${
              danger
                ? 'bg-red-500 shadow-[0_4px_20px_rgba(244,63,94,0.35)] hover:bg-red-400'
                : 'bg-emerald-500 shadow-[0_4px_20px_rgba(167,139,250,0.35)] hover:bg-emerald-400'
            }`}
          >
            {busy ? t('dialog.busy') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}