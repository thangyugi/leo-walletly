'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useIsPhone } from '@/hooks/useMediaQuery'
import { BottomSheet } from './bottom-sheet'
import { useEscapeLayer } from '@/hooks/useEscapeLayer'

const GAP = 6
const EDGE = 8

/**
 * A floating panel under (or above) its anchor, rendered in a portal and kept
 * inside the viewport, so sidebars, cards with overflow and the screen edge
 * never clip it. On phones it becomes a bottom sheet with `title`.
 */
export function Popover({ anchorRef, open, onClose, children, width, align = 'start', title, className, sheetFooter }: {
  anchorRef: React.RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Desired width in px (capped at the viewport). Defaults to the anchor's width. */
  width?: number
  align?: 'start' | 'center' | 'end'
  /** Heading of the phone sheet. */
  title?: React.ReactNode
  className?: string
  sheetFooter?: React.ReactNode
}) {
  const phone = useIsPhone()
  const panelRef = React.useRef<HTMLDivElement>(null)
  const [pos, setPos] = React.useState<React.CSSProperties | null>(null)
  const close = React.useRef(onClose)
  React.useEffect(() => { close.current = onClose })
  useEscapeLayer(onClose, open && !phone)

  const place = React.useCallback(() => {
    const a = anchorRef.current?.getBoundingClientRect()
    if (!a) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(width ?? a.width, vw - EDGE * 2)
    let left = align === 'end' ? a.right - w : align === 'center' ? a.left + a.width / 2 - w / 2 : a.left
    left = Math.max(EDGE, Math.min(left, vw - w - EDGE))
    const below = vh - a.bottom - GAP - EDGE
    const above = a.top - GAP - EDGE
    const h = panelRef.current?.scrollHeight ?? 0
    const up = h > below && above > below
    setPos({ left, width: w, maxHeight: Math.max(160, up ? above : below), ...(up ? { bottom: vh - a.top + GAP } : { top: a.bottom + GAP }) })
  }, [anchorRef, width, align])

  React.useLayoutEffect(() => {
    if (!open || phone) return
    place()
    // Second pass once the panel has its real height (decides up / down).
    const id = requestAnimationFrame(place)
    return () => cancelAnimationFrame(id)
  }, [open, phone, place])

  React.useEffect(() => {
    if (!open || phone) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      // A picker's own sheet / menu opened from inside this popover lives in another portal.
      if ((t as Element).closest?.('[data-bottom-sheet],[data-popover-layer]')) return
      close.current()
    }
    const onMove = (e: Event) => { if (!panelRef.current?.contains(e.target as Node)) place() }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, phone, place, anchorRef])

  if (!open) return null
  if (phone) return <BottomSheet title={title} onClose={onClose} footer={sheetFooter}>{children}</BottomSheet>
  return createPortal(
    <div ref={panelRef} data-popover-layer
      className={cn('fixed z-[10000] overflow-auto bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl animate-slide-in-up', className)}
      style={pos ?? { top: -9999, left: -9999, visibility: 'hidden' }}>
      {children}
    </div>,
    document.body,
  )
}
