'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

/**
 * Short hint shown above a control on hover or keyboard focus (in a portal,
 * so card / table overflow never clips it). The text is also the control's
 * accessible description.
 */
export function Tooltip({ text, children }: { text: string; children: React.ReactElement<React.HTMLAttributes<HTMLElement>> }) {
  const id = React.useId()
  const ref = React.useRef<HTMLSpanElement>(null)
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null)

  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ x: r.left + r.width / 2, y: r.top })
  }
  const hide = () => setPos(null)

  return (
    <span ref={ref} className="inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {React.cloneElement(children, { 'aria-describedby': id } as React.HTMLAttributes<HTMLElement>)}
      {pos && createPortal(
        <span
          id={id}
          role="tooltip"
          className="fixed z-[10001] pointer-events-none -translate-x-1/2 -translate-y-full mb-1.5 px-2 py-1 rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg-surface)] text-[11px] font-medium whitespace-nowrap shadow-lg animate-fade-in"
          style={{ left: pos.x, top: pos.y - 6 }}
        >
          {text}
        </span>,
        document.body,
      )}
      {/* Kept in the DOM for aria-describedby while hidden. */}
      {!pos && <span id={id} className="sr-only">{text}</span>}
    </span>
  )
}
