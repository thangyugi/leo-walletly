'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, Power, RefreshCw, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/async-state'
import { PageHeader } from '@/components/layout/page-header'
import { useRecurringStore, type RecurringTransaction } from '@/stores/recurring'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { cn } from '@/lib/utils'
import { CATEGORIES, PROVIDERS } from '@/lib/constants'
import type { LegacyCategory as Category, PaymentProvider } from '@/types'

interface FormState {
  description: string; amount: string; category: Category
  provider: PaymentProvider; dayOfMonth: string; note: string
}

const DEFAULT_FORM: FormState = {
  description: '', amount: '', category: 'other',
  provider: 'manual', dayOfMonth: '1', note: '',
}

function RecurringForm({ initial, onSave, onCancel }: {
  initial?: Partial<FormState>
  onSave:  (data: FormState) => void
  onCancel:() => void
}) {
  const { t, lang } = useTranslation()
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM, ...initial })

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-surface-default)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl border border-[var(--color-border-default)] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--color-surface-default)] border-b border-[var(--color-border-subtle)] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {initial ? (lang === 'vi' ? 'Chỉnh sửa định kỳ' : (lang === 'ja' ? '定期支払を編集' : 'Edit recurring')) : t.recurring.add}
          </h2>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Input label={lang === 'vi' ? 'Mô tả' : (lang === 'ja' ? '内容' : 'Description')} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder={lang === 'vi' ? 'Ví dụ: Netflix, Gym' : (lang === 'ja' ? '例: Netflix, ジム' : 'e.g. Netflix, Gym')} />
          <Input label={lang === 'vi' ? 'Số tiền' : (lang === 'ja' ? '金額' : 'Amount')} type="number" value={form.amount} onChange={(e) => setField('amount', e.target.value)} placeholder="0" />
          <div className="grid grid-cols-2 gap-3">
            <Select label={t.transactions.labelCategory} value={form.category} onChange={(e) => setField('category', e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </Select>
            <Input label={lang === 'vi' ? 'Ngày trong tháng' : (lang === 'ja' ? '毎月の日' : 'Day of month')} type="number" min="1" max="28" value={form.dayOfMonth} onChange={(e) => setField('dayOfMonth', e.target.value)} />
          </div>
          <Select label={t.transactions.labelProvider} value={form.provider} onChange={(e) => setField('provider', e.target.value as PaymentProvider)}>
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Input label={lang === 'vi' ? 'Ghi chú' : (lang === 'ja' ? 'メモ' : 'Note')} value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder={lang === 'vi' ? 'Ghi chú thêm (tùy chọn)...' : (lang === 'ja' ? 'オプションのメモ...' : 'Optional note...')} />
          <Button className="w-full" onClick={() => form.description && form.amount && onSave(form)}>
            {t.common.save}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function RecurringPage() {
  const { items, add, update, remove } = useRecurringStore()
  const { t, lang } = useTranslation()
  const { format }  = useMoney()
  const [formOpen,  setFormOpen]  = useState(false)
  const [editItem,  setEditItem]  = useState<RecurringTransaction | null>(null)

  function handleSave(data: FormState) {
    const payload = {
      description: data.description,
      amount:      Number(data.amount),
      category:    data.category,
      provider:    data.provider,
      dayOfMonth:  Number(data.dayOfMonth),
      note:        data.note || undefined,
      isActive:    true,
    }
    if (editItem) {
      update(editItem.id, payload)
    } else {
      add(payload)
    }
    setFormOpen(false)
    setEditItem(null)
  }

  const totalMonthly = items.filter((i) => i.isActive).reduce((s, i) => s + i.amount, 0)

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title={t.recurring.title}
        subtitle={t.recurring.subtitle}
        actions={
          <Button size="sm" icon={<Plus />} onClick={() => { setEditItem(null); setFormOpen(true) }}>
            {t.recurring.add}
          </Button>
        }
      />

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card-base p-4">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">
              {lang === 'vi' ? 'Đang hoạt động' : (lang === 'ja' ? '有効な項目' : 'Active items')}
            </p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">{items.filter((i) => i.isActive).length}</p>
          </div>
          <div className="card-base p-4">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">
              {lang === 'vi' ? 'Tổng hàng tháng' : (lang === 'ja' ? '月間合計' : 'Monthly total')}
            </p>
            <p className="text-lg font-semibold font-tabular text-[var(--color-text-loss)]">{format(totalMonthly)}</p>
          </div>
        </div>
      )}

      <Card padding="none">
        {items.length === 0 ? (
          <EmptyState
            icon={<RefreshCw className="w-6 h-6" />}
            title={t.recurring.noData}
            action={
              <Button size="sm" icon={<Plus />} onClick={() => setFormOpen(true)}>
                {t.recurring.add}
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {items.map((item) => (
              <div key={item.id} className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors',
                !item.isActive && 'opacity-50'
              )}>
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-sunken)] flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{item.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {lang === 'vi' ? `Ngày ${item.dayOfMonth} mỗi tháng` : (lang === 'ja' ? `毎月${item.dayOfMonth}日` : `Day ${item.dayOfMonth} each month`)}
                    </span>
                    <Badge variant={item.isActive ? 'gain' : 'neutral'} size="sm" dot>
                      {item.isActive ? (lang === 'vi' ? 'Hoạt động' : (lang === 'ja' ? '有効' : 'Active')) : (lang === 'vi' ? 'Tạm dừng' : (lang === 'ja' ? '無効' : 'Inactive'))}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm font-medium font-tabular text-[var(--color-text-loss)] shrink-0">
                  −{format(item.amount)}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => update(item.id, { isActive: !item.isActive })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors">
                    <Power className={cn('w-3.5 h-3.5', item.isActive ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-quaternary)]')} />
                  </button>
                  <button onClick={() => { setEditItem(item); setFormOpen(true) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors text-[var(--color-text-quaternary)]">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(item.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-status-loss-bg)] hover:text-[var(--color-text-loss)] transition-colors text-[var(--color-text-quaternary)]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {formOpen && (
        <RecurringForm
          initial={editItem ? { description: editItem.description, amount: String(editItem.amount), category: editItem.category, provider: editItem.provider, dayOfMonth: String(editItem.dayOfMonth), note: editItem.note ?? '' } : undefined}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditItem(null) }}
        />
      )}
    </div>
  )
}
