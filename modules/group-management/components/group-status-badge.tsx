import { cn } from '@/lib/utils'
import { GroupStatus } from '../domain/types'

export function GroupStatusBadge({ status }: { status: GroupStatus }) {
  const styles: Record<GroupStatus, string> = {
    active: "bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]",
    archived: "bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]",
    locked: "bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]",
    suspended: "bg-[var(--color-status-warning-bg)] text-[var(--color-text-warning)]"
  }

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
      styles[status]
    )}>
      {status}
    </span>
  )
}
