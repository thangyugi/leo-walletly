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
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all hover:brightness-95 cursor-default shadow-sm',
        className
      )}
      style={{ 
        backgroundColor: color ? `${color}10` : 'var(--color-bg-sunken)',
        color: color || 'var(--color-text-secondary)',
        borderColor: color ? `${color}20` : 'var(--color-border-subtle)'
      }}
    >
      {emoji ? (
        <span className="text-[12px] leading-none">{emoji}</span>
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
        'group flex items-center gap-3 py-2.5 px-3 rounded-2xl cursor-pointer transition-all duration-200 select-none relative overflow-hidden',
        isSelected 
          ? 'bg-white shadow-md border border-[var(--color-interactive-primary-subtle)] text-[var(--color-interactive-primary)] ring-4 ring-[var(--color-interactive-primary-subtle)]/30' 
          : 'hover:bg-white/60 text-[var(--color-text-secondary)] border border-transparent',
      )}
      style={{ marginLeft: `${level * 16}px` }}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-interactive-primary)] rounded-full" />
      )}
      
      <div className="flex items-center justify-center w-5 h-5 shrink-0">
        {hasChildren ? (
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className={cn(
              "p-1 rounded-lg transition-transform",
              isExpanded ? "rotate-0" : "-rotate-90",
              isSelected ? "bg-[var(--color-interactive-primary-subtle)]" : "hover:bg-[var(--color-border-subtle)]"
            )}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        ) : (
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            isSelected ? "bg-[var(--color-interactive-primary)]" : "bg-[var(--color-border-strong)]"
          )} />
        )}
      </div>
      
      <span className="text-xl leading-none shrink-0">{emoji || '📁'}</span>
      <span className={cn(
        "text-sm font-semibold truncate flex-1 tracking-tight",
        isSelected ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
      )}>
        {name}
      </span>
      
      <span className="opacity-0 group-hover:opacity-100 text-[9px] font-black text-[var(--color-text-quaternary)] uppercase tracking-tighter transition-opacity">
        {type?.replace('_', ' ')}
      </span>
    </div>
  )
}
