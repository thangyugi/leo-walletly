'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCheck, Archive, Bell, Settings, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { AppSelect } from '@/components/ui/app-select'
import { NotificationItem } from '@/features/notifications/notification-item'
import { NotificationDetail } from '@/features/notifications/notification-detail'
import { useNotificationsStore, type AppNotification } from '@/features/notifications/store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { PushCard } from '@/features/pwa/push-card'

type TimeFilter = 'any' | 'today' | '7' | '30' | 'month'

export default function NotificationsPage() {
  return <Suspense fallback={null}><NotificationsContent /></Suspense>
}

function NotificationsContent() {
  const { t, tk, lang } = useTranslation()
  const params = useSearchParams()
  const { items, load, markRead, markAllRead, archive } = useNotificationsStore()
  const switchLedger = useLedgerStore((s) => s.switchLedger)
  const currentId = useLedgerStore((s) => s.current?.id)
  const types = useMasterStore((s) => s.notificationTypes)
  const cats = useMasterStore((s) => s.notificationCategories)

  const [kind, setKind] = useState<string>('all')
  const [time, setTime] = useState<TimeFilter>('any')
  const [actor, setActor] = useState<string>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { void load() }, [load])
  // ?id=<notification>: open it (from the bell, a push or a link).
  const idParam = params.get('id')
  const [seenParam, setSeenParam] = useState<string | null>(null)
  if (idParam !== seenParam) { setSeenParam(idParam); setOpenId(idParam) }
  const open = openId ? items.find((x) => x.id === openId) ?? null : null

  const catOf = (n: AppNotification) => types.find((x) => x.code === n.typeCode)?.category_code ?? 'other'
  // Kinds that actually occur, in the settings order.
  const kinds = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of items) counts.set(catOf(n), (counts.get(catOf(n)) ?? 0) + 1)
    const order = cats.map((c) => c.code)
    return [...counts.entries()].sort((a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, types, cats])
  const actors = useMemo(() => [...new Set(items.map((n) => n.params.actor).filter(Boolean))].sort(), [items])

  const since = useMemo(() => {
    const d = new Date()
    if (time === 'today') return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (time === '7') return new Date(d.getTime() - 7 * 864e5)
    if (time === '30') return new Date(d.getTime() - 30 * 864e5)
    if (time === 'month') return new Date(d.getFullYear(), d.getMonth(), 1)
    return null
  }, [time])

  const visible = items.filter((n) =>
    (kind === 'all' || catOf(n) === kind)
    && (!since || new Date(n.createdAt) >= since)
    && (actor === 'all' || n.params.actor === actor)
    && (!unreadOnly || !n.readAt))
  const unread = items.filter((n) => !n.readAt).length
  const filtered = kind !== 'all' || time !== 'any' || actor !== 'all' || unreadOnly
  const clear = () => { setKind('all'); setTime('any'); setActor('all'); setUnreadOnly(false) }

  // Grouped by day: Today, Yesterday, then dates.
  const groups = useMemo(() => {
    const out: { label: string; list: AppNotification[] }[] = []
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (const n of visible) {
      const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0)
      const diff = Math.round((today.getTime() - d.getTime()) / 864e5)
      const label = diff === 0 ? t.notifications.dayToday : diff === 1 ? t.notifications.dayYesterday
        : d.toLocaleDateString(lang, { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
      const g = out[out.length - 1]
      if (g && g.label === label) g.list.push(n); else out.push({ label, list: [n] })
    }
    return out
  }, [visible, lang, t])

  async function openItem(n: AppNotification) {
    if (!n.readAt) void markRead(n.id)
    // Notifications can belong to another ledger: open that one first.
    if (n.ledgerId && n.ledgerId !== currentId) await switchLedger(n.ledgerId)
    setOpenId(n.id)
  }
  const kindLabel = (code: string) => (code === 'other' ? t.notifications.fOther : tk(`notification_category.${code}.name`))
  const selectCls = 'h-9 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[13px] text-[var(--color-text-primary)]'

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.notifications.title} subtitle={t.notifications.subtitle}
        actions={<>
          <Button variant="outline" size="sm" icon={<CheckCheck />} disabled={unread === 0} onClick={() => void markAllRead()}>{t.notifications.markAllRead}</Button>
          <Link href="/settings/notifications"><Button variant="ghost" size="sm" icon={<Settings />} aria-label={t.settings.sidebar.notifications} /></Link>
        </>} />

      {/* Until this device gets them, offer notifications on the lock screen (hidden once on). */}
      <PushCard compact />

      {/* Kinds */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label={t.notifications.filterKind}>
        {[['all', items.length] as [string, number], ...kinds].map(([code, count]) => (
          <button key={code} role="tab" aria-selected={kind === code} onClick={() => setKind(code)}
            className={cn('shrink-0 inline-flex items-center gap-1.5 h-9 pl-3 pr-2 rounded-full border text-[13px] font-medium transition-colors',
              kind === code ? 'bg-[#111827] border-[#111827] text-white' : 'bg-[var(--color-surface-default)] border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]')}>
            {code === 'all' ? t.notifications.fAll : kindLabel(code)}
            <span className={cn('min-w-[22px] h-[22px] px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-semibold',
              kind === code ? 'bg-white/20 text-white' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]')}>{count}</span>
          </button>
        ))}
      </div>

      {/* Time / person / unread */}
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
          className={cn('sm:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[13px] font-medium',
            filtered ? 'border-[var(--color-interactive-primary)] text-[var(--color-brand-700)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[var(--color-text-secondary)]')}>
          <SlidersHorizontal className="w-4 h-4" />{t.notifications.filters}
        </button>
        <div className={cn('flex items-center gap-2 flex-wrap max-sm:w-full', !showFilters && 'max-sm:hidden')}>
          <AppSelect aria-label={t.notifications.filterTime} value={time} onChange={(e) => setTime(e.target.value as TimeFilter)} className={cn(selectCls, 'max-sm:flex-1')}>
            <option value="any">{t.notifications.timeAny}</option>
            <option value="today">{t.notifications.timeToday}</option>
            <option value="7">{t.notifications.time7}</option>
            <option value="30">{t.notifications.time30}</option>
            <option value="month">{t.notifications.timeMonth}</option>
          </AppSelect>
          <AppSelect aria-label={t.notifications.filterActor} value={actor} onChange={(e) => setActor(e.target.value)} className={cn(selectCls, 'max-sm:flex-1')}>
            <option value="all">{t.notifications.actorAll}</option>
            {actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </AppSelect>
          <button type="button" role="switch" aria-checked={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}
            className={cn('inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-[13px] font-medium',
              unreadOnly ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[var(--color-text-secondary)]')}>
            <span className={cn('w-2 h-2 rounded-full', unreadOnly ? 'bg-[var(--color-interactive-primary)]' : 'bg-[var(--color-border-strong)]')} />
            {t.notifications.unreadOnly} <span className="text-[var(--color-text-quaternary)]">{unread}</span>
          </button>
        </div>
        {filtered && (
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 h-9 px-2.5 rounded-lg text-[12.5px] font-medium text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)]">
            <X className="w-3.5 h-3.5" />{t.notifications.clearFilters}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card-base p-12 text-center text-sm text-[var(--color-text-tertiary)]">
          <Bell className="w-6 h-6 mx-auto mb-2" />{filtered ? t.notifications.emptyFiltered : t.notifications.empty}
          {filtered && <div className="mt-3"><Button variant="outline" size="sm" onClick={clear}>{t.notifications.clearFilters}</Button></div>}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="px-1 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">{g.label}</h2>
              <div className="card-base divide-y divide-[var(--color-border-subtle)] overflow-hidden">
                {g.list.map((n) => (
                  <div key={n.id} className={cn('flex items-center group', !n.readAt && 'bg-[var(--color-brand-25)]')}>
                    <div className="flex-1 min-w-0">
                      <NotificationItem n={n} kindLabel={kindLabel(catOf(n))} onClick={() => void openItem(n)} />
                    </div>
                    <button aria-label={t.notifications.archive} onClick={() => void archive(n.id)} className="mr-3 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--color-bg-sunken)] max-sm:hidden">
                      <Archive className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <NotificationDetail key={open?.id ?? 'none'} n={open} onClose={() => setOpenId(null)} onArchive={(n) => { void archive(n.id); setOpenId(null) }} />
    </div>
  )
}
