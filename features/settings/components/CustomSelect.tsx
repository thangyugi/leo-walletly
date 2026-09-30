'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface Option {
  value: string
  label: string
  icon?: React.ElementType
}

interface CustomSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function CustomSelect({ 
  options, 
  value, 
  onChange, 
  disabled, 
  placeholder = 'Select option...',
  className 
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)]",
          disabled && "cursor-not-allowed bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] opacity-50",
          isOpen && "border-[var(--color-interactive-primary)] ring-2 ring-[var(--color-interactive-primary)]/10"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <selectedOption.icon className="w-4 h-4 text-[var(--color-text-quaternary)]" />}
          <span className={cn(!selectedOption && "text-[var(--color-text-quaternary)]")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-quaternary)] transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[300] mt-2 w-full overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-xl"
          >
            <div className="max-h-60 overflow-y-auto p-1 scrollbar-hide">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    value === option.value 
                      ? "bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)]" 
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {option.icon && <option.icon className="w-4 h-4" />}
                    <span>{option.label}</span>
                  </div>
                  {value === option.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
