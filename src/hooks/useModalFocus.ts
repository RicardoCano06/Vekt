import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Options {
  onClose: () => void
  panelRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
}

// Atrapa el foco, cierra con Escape, bloquea el scroll de fondo y restaura el
// foco al cerrar. El foco inicial se omite en punteros gruesos para no abrir
// el teclado virtual al instante.
export function useModalFocus({ onClose, panelRef, initialFocusRef }: Options) {
  const onCloseRef = useRef(onClose)
  const initialFocusRefStable = useRef(initialFocusRef)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    initialFocusRefStable.current = initialFocusRef
  }, [initialFocusRef])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    if (!panel) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const target = coarsePointer ? null : initialFocusRefStable.current?.current
    if (target) {
      target.focus()
    } else {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel).focus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusables.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      try {
        previouslyFocused?.focus()
      } catch {
        // El elemento que abrió el modal ya no existe.
      }
    }
  }, [panelRef])
}
