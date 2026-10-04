'use client'

import * as React from 'react'

/**
 * Drag a sheet down by its grab area to dismiss it (phones). The sheet follows
 * the finger; past `distance` px, or on a quick flick, it slides away and
 * `onClose` runs, otherwise it springs back.
 *
 * Spread the returned handlers on the grab area (handle + title row); `sheetRef`
 * is the element that moves (or the nearest `[data-sheet]` around it).
 */
export function useSwipeToClose<T extends HTMLElement>(onClose: () => void, distance = 110) {
  const sheetRef = React.useRef<T>(null)
  const drag = React.useRef<{ y: number; t: number; dy: number; id: number } | null>(null)
  const close = React.useRef(onClose)
  React.useEffect(() => { close.current = onClose })

  const setY = (dy: number, animate: boolean) => {
    // The sheet may be an outer dialog box marked data-sheet (e.g. a form inside <Modal>).
    const el = sheetRef.current?.closest<HTMLElement>('[data-sheet]') ?? sheetRef.current
    if (!el) return
    el.style.transition = animate ? 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none'
    el.style.transform = dy ? `translateY(${dy}px)` : ''
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || (e.target as Element).closest('button,a,input,select,textarea,[role=switch]')) return
    drag.current = { y: e.clientY, t: performance.now(), dy: 0, id: e.pointerId }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    d.dy = Math.max(0, e.clientY - d.y)
    setY(d.dy, false)
  }
  const end = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const speed = d.dy / Math.max(1, performance.now() - d.t)
    if (d.dy > distance || (d.dy > 30 && speed > 0.6)) {
      setY(window.innerHeight, true)
      window.setTimeout(() => close.current(), 180)
    } else {
      setY(0, true)
    }
  }

  return {
    sheetRef,
    grab: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, style: { touchAction: 'none' as const } },
  }
}
