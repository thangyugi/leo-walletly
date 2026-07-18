'use client'

import * as React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Category } from './types'
import { useCategoryStore } from './store'
import { ParentTreeDropdown } from './category-form'
import { AlertTriangle, GitMerge, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { CategoryIcon } from './category-icon'
import { cn } from '@/lib/utils'

// ─── Inline Tree Node ────────────────────────────────────────────────────────

function TreeNodeItem({
  category,
  depth,
  selected,
  onSelect,
  children,
}: {
  category: Category
  depth: number
  selected: string
  onSelect: (id: string) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(depth < 2)
  const hasChildren = React.Children.count(children) > 0
  const isSelected = selected === category.id

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(category.id)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-[13px] text-left transition-colors cursor-pointer',
          isSelected
            ? 'bg-[var(--color-brand-500)] text-white'
            : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]',
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
            className="shrink-0"
          >
            {open
              ? <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              : <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            }
          </span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span
          className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
          style={{ background: isSelected ? 'rgba(255,255,255,0.2)' : `${category.color}22` }}
        >
          <CategoryIcon name={category.emoji} className="w-3.5 h-3.5" />
        </span>
        <span className="flex-1 min-w-0 truncate">{category.name}</span>
        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
      </button>
      {hasChildren && open && <div>{children}</div>}
    </div>
  )
}

function renderTree(
  nodes: Category[],
  allCategories: Category[],
  depth: number,
  selected: string,
  onSelect: (id: string) => void,
): React.ReactNode {
  return nodes.map(cat => {
    const children = allCategories.filter(c => c.parent_id === cat.id)
    return (
      <TreeNodeItem key={cat.id} category={cat} depth={depth} selected={selected} onSelect={onSelect}>
        {renderTree(children, allCategories, depth + 1, selected, onSelect)}
      </TreeNodeItem>
    )
  })
}

interface MergeCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  sourceCategory: Category | null
  categories: Category[]
  onSuccess?: () => void
}

export function MergeCategoryModal({
  isOpen,
  onClose,
  sourceCategory,
  categories,
  onSuccess,
}: MergeCategoryModalProps) {
  const [targetId, setTargetId] = React.useState('')
  const [isMerging, setIsMerging] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const { mergeCategories } = useCategoryStore()

  // Reset target when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTargetId('')
      setErrorMsg(null)
    }
  }, [isOpen])

  if (!sourceCategory) return null

  // Prevent merging into itself or its descendants
  const getChildrenIds = (catId: string): string[] => {
    const children = categories.filter((c) => c.parent_id === catId).map((c) => c.id)
    return children.concat(...children.map(getChildrenIds))
  }
  
  const invalidIds = [sourceCategory.id, ...getChildrenIds(sourceCategory.id)]
  const validOptions = categories.filter((c) => !invalidIds.includes(c.id) && c.type === sourceCategory.type)

  const handleMerge = async () => {
    if (!targetId) return
    setIsMerging(true)
    setErrorMsg(null)
    try {
      await mergeCategories(sourceCategory.id, targetId)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi gộp danh mục')
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="flex flex-col gap-6">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0">
            <GitMerge className="w-6 h-6 text-[var(--color-interactive-primary)]" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[var(--color-text-primary)] tracking-tight">Gộp Danh mục</h3>
            <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1">
              Chuyển toàn bộ dữ liệu từ danh mục hiện tại sang danh mục mới.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Danh mục bị gộp (sẽ xóa)
            </label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-status-loss-bg)] border border-[var(--color-border-error)]/20">
              <span className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 bg-[var(--color-bg-canvas)] shadow-sm">
                <CategoryIcon name={sourceCategory.emoji} className="w-5 h-5" />
              </span>
              <span className="font-semibold text-[var(--color-text-loss)]">{sourceCategory.name}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Danh mục Đích (nhận dữ liệu)
            </label>
            <div className="border border-[var(--color-border-default)] rounded-[12px] bg-[var(--color-bg-canvas)] max-h-64 overflow-y-auto p-1.5">
              {validOptions.length === 0 ? (
                <div className="p-4 text-center text-[13px] text-[var(--color-text-tertiary)]">
                  Không có danh mục nào hợp lệ để gộp.
                </div>
              ) : (
                renderTree(
                  validOptions.filter(g => !validOptions.find(o => o.id === g.parent_id)),
                  validOptions,
                  0,
                  targetId,
                  setTargetId
                )
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-status-warning-bg)] border border-[var(--color-warning-500)]/30">
          <AlertTriangle className="w-5 h-5 text-[var(--color-text-warning)] shrink-0 mt-0.5" />
          <p className="text-[12px] leading-relaxed text-[var(--color-text-warning)]">
            Hành động này không thể hoàn tác. Mọi giao dịch, quy tắc, và danh mục con của "{sourceCategory.name}" sẽ được chuyển sang danh mục đích. Sau đó, "{sourceCategory.name}" sẽ bị xóa vĩnh viễn.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="h-10 px-5">Hủy bỏ</Button>
          <Button 
            variant="destructive" 
            disabled={!targetId || isMerging} 
            loading={isMerging} 
            onClick={handleMerge}
            className="h-10 px-6 font-semibold"
          >
            Xác nhận Gộp
          </Button>
        </div>
      </div>
    </Modal>
  )
}
