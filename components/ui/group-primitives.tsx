import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, Folder, Briefcase, Database, Tag } from 'lucide-react'

export type GroupType = 'cost_center' | 'department' | 'project' | 'team' | 'subsidiary'

interface GroupBadgeProps {
  name: string
  type: GroupType
  color?: string
  emoji?: string
  className?: string
}

const TYPE_ICONS: Record<GroupType, React.ElementType> = {
  cost_center: Database,
  department: Briefcase,
  project: Tag,
  team: Folder,
  subsidiary: Briefcase,
}

export function GroupBadge({ name, type, color, emoji, className }: GroupBadgeProps) {
  const Icon = TYPE_ICONS[type] || Tag

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border border-transparent shadow-sm transition-all hover:brightness-95 cursor-default',
        className
      )}
      style={{ 
        backgroundColor: color ? `${color}15` : 'var(--color-bg-sunken)',
        color: color || 'var(--color-text-secondary)',
        borderColor: color ? `${color}30` : 'var(--color-border-subtle)'
      }}
    >
      {emoji ? (
        <span className="text-[10px] leading-none">{emoji}</span>
      ) : (
        <Icon className="w-3 h-3" />
      )}
      <span className="truncate max-w-[120px]">{name}</span>
    </div>
  )
}

interface GroupTreeItemProps {
  name: string
  level: number
  hasChildren: boolean
  isExpanded: boolean
  onToggle: () => void
  onSelect: () => void
  isSelected?: boolean
  type: GroupType
  emoji?: string
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
  emoji
}: GroupTreeItemProps) {
  return (
    <div 
      className={cn(
        'group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors select-none',
        isSelected ? 'bg-[var(--color-interactive-primary-subtle)] text-[var(--color-interactive-primary)]' : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]',
      )}
      style={{ paddingLeft: `${level * 16 + 8}px` }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-center w-4 h-4">
        {hasChildren ? (
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="p-0.5 rounded hover:bg-[var(--color-border-subtle)] text-[var(--color-text-quaternary)]"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-border-strong)] ml-1" />
        )}
      </div>
      
      <span className="text-lg leading-none">{emoji || '📁'}</span>
      <span className="text-sm font-medium truncate flex-1">{name}</span>
      
      <span className="opacity-0 group-hover:opacity-100 text-[10px] uppercase font-bold text-[var(--color-text-quaternary)] tracking-widest px-1.5 py-0.5 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
        {type.replace('_', ' ')}
      </span>
    </div>
  )
}
