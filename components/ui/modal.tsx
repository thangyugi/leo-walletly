'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useEscapeLayer } from '@/hooks/useEscapeLayer'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  noPadding?: boolean
  isNested?: boolean
  /** Data-entry forms: full-screen page on phones (see form-dialog.ts). */
  fullScreenOnPhone?: boolean
  /** Extra classes for the backdrop layer (e.g. a higher z-index). */
  overlayClassName?: string
}

export function Modal({ isOpen, onClose, children, className, noPadding, isNested, fullScreenOnPhone, overlayClassName }: ModalProps) {
  const [mounted, setMounted] = React.useState(false)
  useEscapeLayer(onClose, isOpen)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className={cn(
      // Phones: a sheet from the bottom edge; larger screens: a centred dialog.
      "fixed inset-0 z-[9999] flex sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300",
      fullScreenOnPhone ? "items-stretch pt-[max(12px,env(safe-area-inset-top))] sm:pt-4" : "items-end",
      isNested ? "bg-black/40" : "bg-black/60 backdrop-blur-sm",
      overlayClassName
    )}>
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
      />
      <div
        role="dialog"
        aria-modal="true"
        data-sheet={fullScreenOnPhone ? '' : undefined}
        className={cn(
          'relative w-full max-w-xl overflow-y-auto bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] sm:rounded-2xl shadow-2xl animate-sheet-up sm:animate-none',
          fullScreenOnPhone ? 'h-full sm:h-auto sm:max-h-[92vh] rounded-t-[22px] rounded-b-none' : 'max-h-[92dvh] rounded-t-[22px] rounded-b-none',
          className
        )}
      >
        <div className={cn(noPadding ? "" : "p-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:pb-6")}>
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
