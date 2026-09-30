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
}

export function Modal({ isOpen, onClose, children, className, noPadding, isNested }: ModalProps) {
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
      "fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300",
      isNested ? "bg-black/40" : "bg-black/60 backdrop-blur-sm"
    )}>
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-xl max-h-[92dvh] overflow-y-auto bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-t-[22px] rounded-b-none sm:rounded-2xl shadow-2xl animate-sheet-up sm:animate-none',
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
