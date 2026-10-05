'use client'

import { cn } from '@/lib/utils'
import { useApprovalCount } from '@/features/approvals/use-badge'
import { BADGE_HREF } from './nav'

/** Count bubble on a nav item (only "Approvals" has one). */
export function NavBadge({ href, className, dot }: { href: string; className?: string; dot?: boolean }) {
  const n = useApprovalCount()
  if (href !== BADGE_HREF || n === 0) return null
  if (dot) return <span aria-hidden className={cn('w-2 h-2 rounded-full bg-[#f79009] ring-2 ring-[var(--color-surface-default)]', className)} />
  return (
    <span className={cn('min-w-[18px] h-[18px] px-1 rounded-full bg-[#f79009] text-white text-[10.5px] font-bold inline-flex items-center justify-center leading-none', className)}>
      {n > 99 ? '99+' : n}
    </span>
  )
}
