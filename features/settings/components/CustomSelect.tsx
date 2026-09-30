'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover } from '@/components/ui/popover'

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
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className={cn("relative w-full", className)}>
      <button
        ref={buttonRef}
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

      <Popover anchorRef={buttonRef} open={isOpen} onClose={() => setIsOpen(false)} className="p-1">
        <div role="listbox" className="max-sm:px-3 sm:max-h-60 sm:overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 max-sm:min-h-[48px] text-left text-[15px] sm:text-sm transition-colors",
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
      </Popover>
    </div>
  )
}
