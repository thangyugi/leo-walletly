'use client'

import { useEffect, useRef } from 'react'

// Open overlays (modals, sheets, popovers), innermost last.
const stack: symbol[] = []

/**
 * Close an overlay with Escape. Overlays stack: only the top one reacts, so
 * Escape in a dropdown inside a modal closes the dropdown, not the modal.
 */
export function useEscapeLayer(onClose: () => void, active = true) {
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose })
  useEffect(() => {
    if (!active) return
    const me = Symbol('layer')
    stack.push(me)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== me) return
      e.stopPropagation()
      close.current()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      stack.splice(stack.indexOf(me), 1)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [active])
}
