'use client'

import * as React from 'react'
import { useGroupStore } from '../stores/group-store'
import { Group, GroupId } from '../domain/types'
import { groupI18n } from '../i18n/config'
import { cn } from '@/lib/utils'
import { 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Plus, 
  MoreHorizontal, 
  FolderTree,
  Building2,
  Users2,
  Layers,
  LayoutGrid,
  ShieldCheck,
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface TreeExplorerProps {
  lang: 'ja' | 'vi' | 'en'
  workspaceId: string
}

export function GroupTreeExplorer({ lang, workspaceId }: TreeExplorerProps) {
  const t = groupI18n[lang].explorer
  const { groups, tree, fetchGroups, subscribeToGroups, selectGroup, selectedGroupId, status } = useGroupStore()
  const [expanded, setExpanded] = React.useState<Set<GroupId>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState('')

  React.useEffect(() => {
    fetchGroups(workspaceId)
    return subscribeToGroups(workspaceId)
  }, [workspaceId, fetchGroups, subscribeToGroups])

  const toggleExpand = (id: GroupId) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const handleDragStart = (e: React.DragEvent, id: GroupId) => {
    e.dataTransfer.setData('groupId', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetId: GroupId | null) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('groupId')
    if (!draggedId || draggedId === targetId) return
    
    // Prevent dropping into its own descendant (simplified check)
    const draggedGroup = groups[draggedId]
    if (targetId && groups[targetId].path.includes(draggedGroup.code)) return

    await useGroupStore.getState().moveGroup(draggedId, targetId)
  }

  const renderNode = (id: GroupId, level = 0) => {
    const group = groups[id]
    if (!group) return null
    
    // Simple fuzzy search filter
    if (searchQuery && !group.name[lang].toLowerCase().includes(searchQuery.toLowerCase())) {
      // If parent doesn't match, check if any child matches
      const hasMatchingChild = Object.values(groups).some(g => 
        g.path.includes(group.code) && g.name[lang].toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (!hasMatchingChild) return null
    }

    const isExpanded = expanded.has(id) || !!searchQuery
    const isSelected = selectedGroupId === id
    const children = Object.values(groups).filter(g => g.parentGroupId === id)

    return (
      <div 
        key={id} 
        className="select-none"
        draggable
        onDragStart={(e) => handleDragStart(e, id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, id)}
      >
        <div 
          className={cn(
            "group flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-all duration-75",
            isSelected ? "bg-[var(--color-interactive-primary-subtle)] text-[var(--color-interactive-primary)]" : "hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => selectGroup(id)}
        >
          <div 
            className="w-4 h-4 flex items-center justify-center opacity-60 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); toggleExpand(id) }}
          >
            {children.length > 0 && (
              isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            )}
          </div>
          
          <span className="text-sm font-medium truncate flex-1">
            {group.name[lang]}
          </span>
          
          {group.status === 'locked' && <ShieldCheck className="w-3 h-3 text-[var(--color-text-tertiary)]" />}
          
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button className="p-1 hover:bg-[var(--color-border-subtle)] rounded transition-colors">
              <Plus className="w-3 h-3" />
            </button>
            <button className="p-1 hover:bg-[var(--color-border-subtle)] rounded transition-colors">
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {isExpanded && children.length > 0 && (
          <div className="mt-0.5">
            {children.map(child => renderNode(child.id, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)] w-80 shrink-0">
      {/* Header */}
      <div className="p-4 space-y-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[var(--color-interactive-primary)]" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-primary)]">
              {t.title}
            </h2>
          </div>
          {status === 'syncing' && (
            <div className="w-2 h-2 rounded-full bg-[var(--color-interactive-primary)] animate-pulse" />
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-quaternary)]" />
          <Input 
            className="pl-9 h-9 text-xs bg-[var(--color-bg-sunken)] border-transparent focus:bg-[var(--color-bg-surface)] transition-all"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tree Area */}
      <div 
        className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null)} // Drop to root
      >
        {status === 'loading' ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 w-full bg-[var(--color-bg-sunken)] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          tree.map(id => renderNode(id))
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]/30">
        <Button variant="secondary" className="w-full justify-start gap-2 h-9 text-xs font-semibold" icon={<Plus className="w-4 h-4" />}>
          {t.newGroup}
        </Button>
      </div>
    </div>
  )
}
