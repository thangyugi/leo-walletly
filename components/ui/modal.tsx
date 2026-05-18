'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function Modal({ isOpen, onClose, children, className, noPadding }: ModalProps) {
  const [mounted, setMounted] = React.useState(false)

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
      />
      <div 
        className={cn(
          'relative w-full max-w-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300',
          className
        )}
      >
        <div className={cn(noPadding ? "" : "p-6")}>
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
