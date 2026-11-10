import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useModalFocus } from '@/hooks/useModalFocus'
import { useLang } from '@/lib/lang-context'

interface BottomSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const { t } = useLang()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useModalFocus({ onClose, panelRef, initialFocusRef: closeRef })

  // Portal a body: dentro del wrapper `animate-rise` de la ruta (transform
  // permanente) un `fixed` queda relativo al contenido y el sheet se sale del
  // viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="ui-card w-full max-w-md animate-rise overscroll-contain rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_18px_50px_-24px_rgba(0,0,0,0.8)] [clip-path:none] sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-edge2" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-semibold">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-dim2 transition-colors hover:bg-surface2 hover:text-soft"
          >
            ✕
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>,
    document.body,
  )
}