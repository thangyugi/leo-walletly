'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Archive, Bell, Settings } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { NotificationItem } from '@/features/notifications/notification-item'
import { useNotificationsStore } from '@/features/notifications/store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { items, load, markRead, markAllRead, archive } = useNotificationsStore()
  const switchLedger = useLedgerStore((s) => s.switchLedger)
  const currentId = useLedgerStore((s) => s.current?.id)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => { void load() }, [load])

  const visible = filter === 'unread' ? items.filter((n) => !n.readAt) : items
  const unread = items.filter((n) => !n.readAt).length

  return (
    <div className="animate-fade-in space-y-5 max-w-3xl">
      <PageHeader title={t.notifications.title} subtitle={t.notifications.subtitle}
        actions={<>
          <Button variant="outline" size="sm" icon={<CheckCheck />} disabled={unread === 0} onClick={() => void markAllRead()}>{t.notifications.markAllRead}</Button>
          <Link href="/settings/notifications"><Button variant="ghost" size="sm" icon={<Settings />} aria-label={t.settings.sidebar.notifications} /></Link>
        </>} />

      <div className="inline-flex rounded-lg border border-[var(--color-border-default)] p-0.5 bg-[var(--color-surface-default)]" role="tablist">
        {([['all', t.notifications.all, items.length], ['unread', t.notifications.unread, unread]] as const).map(([v, l, n]) => (
          <button key={v} role="tab" aria-selected={filter === v} onClick={() => setFilter(v)}
            className={cn('px-3 h-8 rounded-md text-xs font-medium', filter === v ? 'bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]')}>
            {l} <span className="ml-1 text-[var(--color-text-quaternary)]">{n}</span>
          </button>
        ))}
      </div>

      <div className="card-base divide-y divide-[var(--color-border-subtle)] overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--color-text-tertiary)]"><Bell className="w-6 h-6 mx-auto mb-2" />{t.notifications.empty}</div>
        ) : visible.map((n) => (
          <div key={n.id} className={cn('flex items-center group', !n.readAt && 'bg-[var(--color-brand-25)]')}>
            <div className="flex-1 min-w-0">
              <NotificationItem n={n} onClick={async () => {
                if (!n.readAt) await markRead(n.id)
                // Notifications can belong to another ledger: open that one first.
                if (n.ledgerId && n.ledgerId !== currentId) await switchLedger(n.ledgerId)
                if (n.actionUrl) router.push(n.actionUrl)
              }} />
            </div>
            <button aria-label={t.notifications.archive} onClick={() => void archive(n.id)} className="mr-3 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--color-bg-sunken)]">
              <Archive className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
