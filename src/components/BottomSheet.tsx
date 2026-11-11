import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PointerEvent, ReactNode } from 'react'
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
  const dragStart = useRef(0)
  const dragYRef = useRef(0)
  const draggingRef = useRef(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  useModalFocus({ onClose, panelRef, initialFocusRef: closeRef })

  function onDragStart(event: PointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientY
    draggingRef.current = true
    setDragging(true)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // punteros sintéticos o navegadores sin captura
    }
  }

  function onDragMove(event: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    const next = Math.max(0, event.clientY - dragStart.current)
    dragYRef.current = next
    setDragY(next)
  }

  function onDragEnd() {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    if (dragYRef.current > 90) {
      onClose()
    } else {
      dragYRef.current = 0
      setDragY(0)
    }
  }

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
        className="ui-card w-full max-w-md overscroll-contain rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_18px_50px_-24px_rgba(0,0,0,0.8)] [clip-path:none] sm:rounded-2xl sm:pb-5"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden="true"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="-mx-2 -mt-2 mb-3 flex cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
        >
          <span className="h-1 w-12 rounded-full bg-edge2" />
        </div>
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