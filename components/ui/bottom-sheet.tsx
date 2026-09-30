'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useEscapeLayer } from '@/hooks/useEscapeLayer'

/**
 * Phone replacement for popovers and dropdowns: a sheet from the bottom edge,
 * above everything (tab bar included). Closes on backdrop tap or Escape and
 * keeps the page behind it from scrolling.
 */
export function BottomSheet({ title, onClose, children, className, bodyClassName, footer }: {
  title?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  /** Pinned under the scrolling body (e.g. Cancel / Apply). */
  footer?: React.ReactNode
}) {
  const { t } = useTranslation()
  const ref = React.useRef<HTMLDivElement>(null)
  useEscapeLayer(onClose)

  React.useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[10000]" data-bottom-sheet>
      <div className="absolute inset-0 bg-black/35 animate-fade-in" onClick={onClose} />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
        className={cn('absolute inset-x-0 bottom-0 max-h-[88dvh] flex flex-col rounded-t-[22px] bg-[var(--color-bg-surface)] shadow-2xl animate-sheet-up focus:outline-none', className)}>
        <div className="flex justify-center pt-2 shrink-0"><span className="w-10 h-1.5 rounded-full bg-[var(--color-border-strong)]" /></div>
        {title !== undefined && (
          <div className="flex items-center gap-2 pl-5 pr-2 pt-1 pb-1 shrink-0">
            <h2 className="flex-1 min-w-0 truncate text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
            <button type="button" onClick={onClose} aria-label={t.common.close} className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--color-text-tertiary)]">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className={cn('flex-1 min-h-0 overflow-y-auto overscroll-contain', !footer && 'pb-[max(16px,env(safe-area-inset-bottom))]', bodyClassName)}>{children}</div>
        {footer && <div className="shrink-0 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-[var(--color-border-subtle)]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
