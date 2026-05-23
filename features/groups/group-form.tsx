'use client'

import * as React from 'react'
import { useGroupStore, getCategoryDepth, getSubtreeHeight } from './store'
import { GroupType } from '@/components/ui/group-primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { getTranslations, Lang } from '@/lib/i18n'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { X, Save, Plus, Tag as TagIcon, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRESET_ICONS, GroupIcon } from './group-icon'
import { Modal } from '@/components/ui/modal'

interface GroupFormProps {
  lang?:        Lang
  onClose:      () => void
  initialData?: any
}

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

const GROUP_TYPES: { value: GroupType; label: string }[] = [
  { value: 'cost_center', label: 'Cost Center' },
  { value: 'department',  label: 'Department'  },
  { value: 'project',     label: 'Project'     },
  { value: 'team',        label: 'Team'        },
  { value: 'subsidiary',  label: 'Subsidiary'  },
]

export function GroupForm({ lang = 'ja', onClose, initialData }: GroupFormProps) {
  const t = getTranslations(lang)
  const { currentLedger } = useLedgerStore()
  const { groups, createGroup, updateGroup } = useGroupStore()

  const [formData, setFormData] = React.useState({
    name:         initialData?.name          || '',
    type:         (initialData?.type as GroupType) || 'cost_center',
    parent_id:    initialData?.parent_id     || '',
    color:        initialData?.color         || PRESET_COLORS[0],
    emoji:        initialData?.emoji         || PRESET_ICONS[0],
    budget_limit: initialData?.budget_limit  || 0,
    keywords:     (initialData?.keywords     || []) as string[],
  })

  const [keywordInput, setKeywordInput] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [budgetWarning, setBudgetWarning] = React.useState<{ message: string, payload: any } | null>(null)

  const performSave = async (payload: any) => {
    try {
      if (initialData?.id) {
        await updateGroup(initialData.id, payload)
      } else {
        await createGroup(payload)
      }
      onClose()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Có lỗi xảy ra khi lưu nhóm')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentLedger?.id) return
    setIsSaving(true)
    
    // Auto-add pending keyword if user forgot to press Enter
    let finalKeywords = formData.keywords
    const kw = keywordInput.trim()
    if (kw && !finalKeywords.includes(kw)) {
      finalKeywords = [...finalKeywords, kw]
      setFormData(prev => ({ ...prev, keywords: finalKeywords }))
      setKeywordInput('')
    }
    
    const payload = {
      ...formData,
      keywords: finalKeywords,
      ledger_id:    currentLedger.id,
      parent_id:    formData.parent_id === '' ? null : formData.parent_id,
      budget_limit: Number(formData.budget_limit),
    }

    // Budget Validation
    if (payload.parent_id && payload.budget_limit > 0) {
      const parentGroup = groups.find(g => g.id === payload.parent_id)
      if (parentGroup && parentGroup.budget_limit > 0) {
        const otherSubGroups = groups.filter(g => g.parent_id === payload.parent_id && g.id !== initialData?.id)
        const otherBudgets = otherSubGroups.reduce((acc, g) => acc + (g.budget_limit || 0), 0)
        const total = otherBudgets + payload.budget_limit
        if (total > parentGroup.budget_limit) {
          setIsSaving(false)
          setBudgetWarning({
            message: `Tổng ngân sách của các nhóm con (${total.toLocaleString()}) đã vượt quá ngân sách của nhóm cha "${parentGroup.name}" (${parentGroup.budget_limit.toLocaleString()}). Bạn có muốn tiếp tục lưu không?`,
            payload
          })
          return
        }
      }
    }

    await performSave(payload)
  }

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !formData.keywords.includes(kw)) {
      setFormData({ ...formData, keywords: [...formData.keywords, kw] })
      setKeywordInput('')
    }
  }

  const removeKeyword = (kw: string) => {
    setFormData({ ...formData, keywords: formData.keywords.filter((k) => k !== kw) })
  }

  const parentOptions = React.useMemo(() => {
    const currentId = initialData?.id
    const currentCat = currentId ? groups.find(g => g.id === currentId) : null
    const height = currentCat ? getSubtreeHeight(currentCat, groups) : 1

    return groups.filter((g) => {
      // Cannot select itself as parent
      if (g.id === currentId) return false
      
      // Prevent circular reference
      let curr = g
      while (curr.parent_id) {
        if (curr.parent_id === currentId) return false
        const parent = groups.find(p => p.id === curr.parent_id)
        if (parent) {
          curr = parent
        } else {
          break
        }
      }

      // Check depth constraint: depth of parent + height of subtree must be <= 4
      const pDepth = getCategoryDepth(g, groups)
      return (pDepth + height) <= 4
    })
  }, [groups, initialData])

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white rounded-[24px] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
      {/* Modal header */}
      <div className="flex items-center justify-between px-8 py-6 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-default)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {initialData ? 'Cập nhật nhóm' : 'Tạo nhóm mới'}
          </h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            {initialData ? 'Chỉnh sửa thông tin nhóm của bạn' : 'Thiết lập nhóm phân loại mới cho sổ cái của bạn'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-default)] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </button>
      </div>

      {/* Body */}
      <div className="px-8 py-6 space-y-8 overflow-y-auto flex-1">
        
        {/* Name and Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <Input
              label="Tên nhóm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Chi phí Marketing, Ăn uống..."
              required
              className="h-12 text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block">
              Loại nhóm
            </label>
            <select
              className={cn(
                'w-full h-12 px-4 rounded-xl border text-base font-medium',
                'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
                'border-[var(--color-border-default)] focus:border-[var(--color-border-focus)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
                'appearance-none cursor-pointer',
              )}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as GroupType })}
            >
              {GROUP_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block">
              Nhóm cha (nếu có)
            </label>
            <select
              className={cn(
                'w-full h-12 px-4 rounded-xl border text-base font-medium',
                'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
                'border-[var(--color-border-default)] focus:border-[var(--color-border-focus)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
                'appearance-none cursor-pointer',
              )}
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
            >
              <option value="">-- Không có nhóm cha --</option>
              {parentOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual Identity */}
        <div className="p-5 rounded-2xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] space-y-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Đặc điểm nhận diện</h3>
          
          <div className="space-y-3">
            <label className="text-xs font-medium text-[var(--color-text-tertiary)] block">
              Biểu tượng (Icon)
            </label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setFormData({ ...formData, emoji: iconName })}
                  className={cn(
                    'h-12 flex items-center justify-center rounded-xl transition-all cursor-pointer',
                    formData.emoji === iconName
                      ? 'bg-white shadow-md border scale-110 z-10'
                      : 'hover:bg-white/70 text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)]',
                  )}
                  style={formData.emoji === iconName ? { color: formData.color, borderColor: formData.color } : {}}
                >
                  <GroupIcon name={iconName} className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-[var(--color-text-tertiary)] block">
              Màu sắc
            </label>
            <div className="flex gap-3 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-transform cursor-pointer',
                    formData.color === color ? 'scale-110 shadow-md ring-2 ring-offset-2 ring-white' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: color }}
                >
                  {formData.color === color && <Check className="w-5 h-5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Setup */}
        <div className="space-y-2">
          <NumberInput
            label="Ngân sách hàng tháng"
            value={formData.budget_limit}
            onChange={(val) => setFormData({ ...formData, budget_limit: val })}
            placeholder="0"
          />
          <p className="text-xs text-[var(--color-text-tertiary)]">Giới hạn chi tiêu mỗi tháng cho nhóm này.</p>
        </div>

        {/* Keywords */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-2">
            <TagIcon className="w-4 h-4" />
            Từ khóa tự động phân loại
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              placeholder="Nhập từ khóa và nhấn Enter..."
              className={cn(
                'flex-1 h-12 px-4 rounded-xl border text-base',
                'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
                'placeholder:text-[var(--color-text-placeholder)]',
                'border-[var(--color-border-default)] focus:border-[var(--color-border-focus)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
              )}
            />
            <Button type="button" size="lg" onClick={addKeyword} icon={<Plus />} className="shrink-0 h-12 px-6 rounded-xl">
              Thêm
            </Button>
          </div>
          <div className="min-h-[80px] flex flex-wrap gap-2 p-4 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] content-start">
            {formData.keywords.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 opacity-50 w-full py-4 text-[var(--color-text-quaternary)]">
                <TagIcon className="w-6 h-6" />
                <p className="text-sm">Chưa có từ khóa nào</p>
              </div>
            ) : (
              formData.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[var(--color-border-default)] text-sm font-medium text-[var(--color-text-secondary)] shadow-sm hover:border-[var(--color-interactive-primary)] transition-colors"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-loss)] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-[var(--color-border-default)] bg-[var(--color-surface-default)]">
        <Button type="button" variant="secondary" onClick={onClose} className="h-11 px-6 rounded-xl text-sm cursor-pointer">
          Hủy bỏ
        </Button>
        <Button type="submit" icon={<Save className="w-4 h-4" />} disabled={isSaving} className="h-11 px-8 rounded-xl text-sm font-semibold cursor-pointer">
          {isSaving ? 'Đang lưu…' : 'Lưu nhóm'}
        </Button>
      </div>

      {/* Budget Warning Modal */}
      <Modal isOpen={!!budgetWarning} onClose={() => setBudgetWarning(null)} className="max-w-md">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-[var(--color-warning-600)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
            <h3 className="text-lg font-bold">Cảnh báo Ngân sách</h3>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {budgetWarning?.message}
          </p>
          <div className="flex items-center justify-end gap-3 mt-2">
            <Button type="button" variant="secondary" onClick={() => setBudgetWarning(null)} className="cursor-pointer">
              Xem lại
            </Button>
            <Button type="button" onClick={() => {
              const payload = budgetWarning?.payload;
              setBudgetWarning(null);
              setIsSaving(true);
              if (payload) performSave(payload);
            }} className="bg-[var(--color-warning-600)] hover:bg-[var(--color-warning-700)] text-white cursor-pointer border-transparent shadow-none">
              Vẫn tiếp tục lưu
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  )
}
