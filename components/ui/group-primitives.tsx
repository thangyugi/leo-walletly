import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Briefcase, Database, Tag, Folder, Building2 } from 'lucide-react'

export type GroupType = 'cost_center' | 'department' | 'project' | 'team' | 'subsidiary'

// ─────────────────────────────────────────────────────────────
// GroupBadge — inline chip with emoji/icon + name
// ─────────────────────────────────────────────────────────────
interface GroupBadgeProps {
  name: string
  type: GroupType
  color?: string
  emoji?: string
  className?: string
}

const TYPE_ICONS: Record<GroupType, React.ElementType> = {
  cost_center: Database,
  department:  Briefcase,
  project:     Tag,
  team:        Folder,
  subsidiary:  Building2,
}

export function GroupBadge({ name, type, color, emoji, className }: GroupBadgeProps) {
  const Icon = TYPE_ICONS[type] ?? Tag

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:brightness-95 cursor-default shadow-xs',
        className,
      )}
      style={{
        backgroundColor: color ? `${color}12` : 'var(--color-bg-sunken)',
        color:           color ?? 'var(--color-text-secondary)',
        borderColor:     color ? `${color}20` : 'var(--color-border-subtle)',
      }}
    >
      {emoji ? (
        <span className="text-sm leading-none">{emoji}</span>
      ) : (
        <Icon className="w-3 h-3 shrink-0" />
      )}
      <span className="truncate max-w-[120px]">{name}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// GroupTreeItem — sidebar tree node
// ─────────────────────────────────────────────────────────────
interface GroupTreeItemProps {
  name:        string
  level:       number
  hasChildren: boolean
  isExpanded:  boolean
  onToggle:    () => void
  onSelect:    () => void
  isSelected?: boolean
  type:        GroupType
  emoji?:      string
}

export function GroupTreeItem({
  name,
  level,
  hasChildren,
  isExpanded,
  onToggle,
  onSelect,
  isSelected,
  type,
  emoji,
}: GroupTreeItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2.5 py-2 px-3 rounded-xl cursor-pointer transition-all duration-150 select-none relative',
        isSelected
          ? 'bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)]'
          : 'hover:bg-[var(--color-sidebar-item-hover)] text-[var(--color-text-secondary)]',
      )}
      style={{ paddingLeft: `${12 + level * 16}px` }}
      onClick={onSelect}
    >
      {/* Active indicator */}
      {isSelected && (
        <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[var(--color-interactive-primary)] rounded-full" />
      )}

      {/* Expand toggle or leaf dot */}
      <div className="w-4 h-4 flex items-center justify-center shrink-0">
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className={cn(
              'w-4 h-4 flex items-center justify-center rounded transition-transform duration-150',
              isExpanded ? 'rotate-0' : '-rotate-90',
              isSelected
                ? 'text-[var(--color-sidebar-item-active-text)]'
                : 'text-[var(--color-text-quaternary)] hover:text-[var(--color-text-tertiary)]',
            )}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span
            className={cn(
              'w-1 h-1 rounded-full',
              isSelected
                ? 'bg-[var(--color-interactive-primary)]'
                : 'bg-[var(--color-border-strong)]',
            )}
          />
        )}
      </div>

      {/* Emoji */}
      <span className="text-base leading-none shrink-0">{emoji || '📁'}</span>

      {/* Name */}
      <span
        className={cn(
          'text-sm font-medium truncate flex-1 leading-tight',
          isSelected
            ? 'text-[var(--color-sidebar-item-active-text)] font-semibold'
            : 'text-[var(--color-text-secondary)]',
        )}
      >
        {name}
      </span>

      {/* Type label — appears on hover */}
      <span className="opacity-0 group-hover:opacity-100 text-[9px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider transition-opacity shrink-0">
        {type?.replace('_', ' ')}
      </span>
    </div>
  )
}
