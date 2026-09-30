'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeLayer } from '@/hooks/useEscapeLayer'
import Link from 'next/link'
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, X, ArrowRight, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { AmountInput } from '@/components/ui/amount-input'
import { EmptyState } from '@/components/ui/async-state'
import { PageHeader } from '@/components/layout/page-header'
import { CategoryIcon } from '@/features/categories/category-icon'
import { useAccountsStore, type Account, type AccountInput } from '@/features/accounts/store'
import { useMasterStore } from '@/features/master/store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { cn, toLocalISODate } from '@/lib/utils'

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#64748b']

function AccountForm({ initial, onClose }: { initial?: Account; onClose: () => void }) {
  useEscapeLayer(onClose)
  const { t, tk } = useTranslation()
  const { ledger } = useLedgerData()
  const { accountTypes, providers, currencies } = useMasterStore()
  const { create, update } = useAccountsStore()
  const [form, setForm] = useState<AccountInput>(() => initial ? {
    name: initial.name, accountTypeCode: initial.accountTypeCode, providerCode: initial.providerCode, currencyCode: initial.currencyCode,
    openingBalance: initial.openingBalance, openingDate: initial.openingDate, institutionName: initial.institutionName, last4: initial.last4,
    creditLimit: initial.creditLimit, color: initial.color, includeInNetWorth: initial.includeInNetWorth,
  } : {
    name: '', accountTypeCode: 'cash', providerCode: null, currencyCode: ledger?.currency_code ?? 'JPY', openingBalance: 0,
    openingDate: toLocalISODate(), color: COLORS[0], includeInNetWorth: true,
  })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof AccountInput>(k: K, v: AccountInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const type = accountTypes.find((a) => a.code === form.accountTypeCode)
  const typeProviders = providers.filter((p) => p.is_active && (!p.account_type_code || p.account_type_code === form.accountTypeCode) && p.code !== 'manual')

  async function save() {
    if (!ledger || !form.name.trim()) return toast.error(t.catform.errorName)
    setSaving(true)
    try {
      if (initial) await update(initial.id, form)
      else await create(ledger.id, form)
      toast.success(t.txform.saved)
      onClose()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={initial ? t.accounts.edit : t.accounts.add}
        className="relative bg-[var(--color-surface-default)] rounded-t-[22px] sm:rounded-2xl w-full sm:max-w-lg shadow-xl border border-[var(--color-border-default)] max-h-[92dvh] overflow-y-auto overscroll-contain animate-sheet-up sm:animate-none pb-[env(safe-area-inset-bottom)]">
        <div className="sticky top-0 bg-[var(--color-surface-default)] border-b border-[var(--color-border-subtle)] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-sm font-semibold">{initial ? t.accounts.edit : t.accounts.add}</h2>
          <button onClick={onClose} aria-label={t.common.close} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">{t.accounts.type}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={t.accounts.type}>
              {accountTypes.map((at) => (
                <button key={at.code} role="radio" aria-checked={form.accountTypeCode === at.code} onClick={() => setForm((f) => ({ ...f, accountTypeCode: at.code, providerCode: null }))}
                  className={cn('flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs', form.accountTypeCode === at.code ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border-default)]')}>
                  <CategoryIcon name={at.icon} className="w-4 h-4" />{tk(at.name_key)}
                </button>
              ))}
            </div>
          </div>
          <Input label={t.accounts.name} value={form.name} onChange={(e) => set('name', e.target.value)} />
          {typeProviders.length > 0 && (
            <Select label={t.accounts.provider} value={form.providerCode ?? ''} onChange={(e) => {
              const p = providers.find((x) => x.code === e.target.value)
              setForm((f) => ({ ...f, providerCode: e.target.value || null, color: p?.color ?? f.color, name: f.name || (p ? tk(p.name_key) : '') }))
            }}>
              <option value="">{t.accounts.noProvider}</option>
              {typeProviders.map((p) => <option key={p.code} value={p.code}>{tk(p.name_key)}</option>)}
            </Select>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Select label={t.accounts.currency} value={form.currencyCode} onChange={(e) => set('currencyCode', e.target.value)} disabled={!!initial}>
              {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </Select>
            <AmountInput label={t.accounts.openingBalance} currency={form.currencyCode} value={String(form.openingBalance ?? 0)} onChange={(v) => set('openingBalance', Number(v) || 0)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t.accounts.openingDate} type="date" value={form.openingDate ?? ''} onChange={(e) => set('openingDate', e.target.value)} />
            {type?.is_liability
              ? <AmountInput label={t.accounts.creditLimit} currency={form.currencyCode} value={form.creditLimit != null ? String(form.creditLimit) : ''} onChange={(v) => set('creditLimit', v ? Number(v) : null)} />
              : <Input label={t.accounts.last4} maxLength={4} value={form.last4 ?? ''} onChange={(e) => set('last4', e.target.value.replace(/\D/g, ''))} />}
          </div>
          {form.accountTypeCode === 'bank' && <Input label={t.accounts.institution} value={form.institutionName ?? ''} onChange={(e) => set('institutionName', e.target.value)} />}
          <div className="flex gap-2" role="radiogroup" aria-label="color">
            {COLORS.map((c) => <button key={c} role="radio" aria-checked={form.color === c} aria-label={c} onClick={() => set('color', c)} className={cn('w-7 h-7 rounded-full', form.color === c && 'ring-2 ring-offset-2 ring-[var(--color-border-focus)]')} style={{ background: c }} />)}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.includeInNetWorth ?? true} onChange={(e) => set('includeInNetWorth', e.target.checked)} className="accent-[var(--color-interactive-primary)]" />{t.accounts.includeNetWorth}
          </label>
          <Button className="w-full" onClick={save} loading={saving}>{t.common.save}</Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function AccountsPage() {
  const { t, tk } = useTranslation()
  const { format } = useMoney()
  const { accounts } = useLedgerData()
  const { accountTypes } = useMasterStore()
  const { update, remove } = useAccountsStore()
  const can = useLedgerStore((s) => s.can)
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const active = accounts.filter((a) => !a.isArchived)
  const archived = accounts.filter((a) => a.isArchived)
  const netWorth = active.filter((a) => a.includeInNetWorth).reduce((s, a) => s + a.balance, 0)
  const groups = accountTypes.map((at) => ({ at, items: active.filter((a) => a.accountTypeCode === at.code) })).filter((g) => g.items.length)

  async function del(a: Account) {
    if (!confirm(`${t.accounts.delete}: ${a.name}?`)) return
    try { await remove(a.id) } catch (e: any) { toast.error(e.message === 'ACCOUNT_HAS_TRANSACTIONS' ? t.accounts.deleteBlocked : e.message) }
  }

  const card = (a: Account) => (
    <div key={a.id} className={cn('card-base p-4 flex flex-col gap-3', a.isArchived && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: a.color ?? '#64748b' }}>{a.name.slice(0, 2).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{a.name}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">{a.currencyCode}{a.last4 ? ` · ••${a.last4}` : ''} · {t.accounts.txThisMonth.replace('{{count}}', String(a.txCountThisMonth))}</p>
        </div>
        {can('account.update') && (
          <div className="flex">
            <button aria-label={t.common.edit} onClick={() => setEditing(a)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)]"><Pencil className="w-3.5 h-3.5" /></button>
            <button aria-label={a.isArchived ? t.accounts.unarchive : t.accounts.archive} onClick={() => void update(a.id, { isArchived: !a.isArchived })} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)]">
              {a.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </button>
            {can('account.delete') && <button aria-label={t.accounts.delete} onClick={() => del(a)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]"><Trash2 className="w-3.5 h-3.5" /></button>}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase font-semibold text-[var(--color-text-quaternary)]">{t.accounts.balance}</p>
          <p className={cn('text-xl font-semibold font-tabular', a.balance < 0 ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-primary)]')}>{format(a.balance, { from: a.currencyCode as never, to: a.currencyCode as never })}</p>
          {a.creditLimit ? <p className="text-[11px] text-[var(--color-text-tertiary)]">{t.accounts.creditLimit}: {format(a.creditLimit, { from: a.currencyCode as never, to: a.currencyCode as never })}</p> : null}
        </div>
        <Link href={`/transactions?account=${a.id}`} className="text-xs text-[var(--color-text-link)] flex items-center gap-1 hover:underline">{t.accounts.viewTransactions}<ArrowRight className="w-3 h-3" /></Link>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.accounts.title} subtitle={t.accounts.subtitle}
        actions={can('account.create') ? <Button size="sm" icon={<Plus />} onClick={() => setEditing('new')}>{t.accounts.add}</Button> : undefined} />

      <div className="card-base p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center"><Landmark className="w-5 h-5 text-[var(--color-brand-600)]" /></div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-[var(--color-text-quaternary)]">{t.accounts.netWorth}</p>
          <p className={cn('text-2xl font-semibold font-tabular', netWorth < 0 ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-primary)]')}>{format(netWorth)}</p>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="card-base"><EmptyState title={t.accounts.empty} description={t.accounts.emptySub} action={<Button size="sm" icon={<Plus />} onClick={() => setEditing('new')}>{t.accounts.add}</Button>} /></div>
      ) : groups.map(({ at, items }) => (
        <section key={at.code}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] mb-2 flex items-center gap-2">
            <CategoryIcon name={at.icon} className="w-3.5 h-3.5" />{tk(at.name_key)}
            <span className="font-tabular normal-case">{format(items.reduce((s, a) => s + a.balance, 0))}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{items.map(card)}</div>
        </section>
      ))}

      {archived.length > 0 && (
        <section>
          <button onClick={() => setShowArchived((v) => !v)} className="text-xs text-[var(--color-text-tertiary)] hover:underline">{t.accounts.archived} ({archived.length})</button>
          {showArchived && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-2">{archived.map(card)}</div>}
        </section>
      )}

      {editing && <AccountForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
