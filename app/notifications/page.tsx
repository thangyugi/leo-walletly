'use client'

import { useState } from 'react'
import { Check, AlertTriangle, Info, Zap, Bell, CheckCheck, Filter } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type NotifType = 'all' | 'unread'

const NOTIFICATIONS = [
  {
    id: '1',
    icon: AlertTriangle,
    iconColor: 'text-[var(--color-text-warning)]',
    iconBg:    'bg-[var(--color-status-warning-bg)]',
    category:  'Budget',
    title:     'Budget alert: Food & Dining',
    body:      'Your Food & Dining group has reached 85% of its monthly budget of ¥30,000. You have ¥4,500 remaining for the rest of the month.',
    time:      '2 hours ago',
    date:      '2026-05-08',
    read:      false,
  },
  {
    id: '2',
    icon: Check,
    iconColor: 'text-[var(--color-text-gain)]',
    iconBg:    'bg-[var(--color-status-gain-bg)]',
    category:  'Import',
    title:     'Import complete',
    body:      '128 transactions were successfully imported from your SMBC CSV file. 94 were auto-categorized based on your existing group rules.',
    time:      '1 day ago',
    date:      '2026-05-07',
    read:      false,
  },
  {
    id: '3',
    icon: Info,
    iconColor: 'text-[var(--color-text-info)]',
    iconBg:    'bg-[var(--color-status-info-bg)]',
    category:  'Report',
    title:     'May 2026 report is ready',
    body:      'Your monthly financial report for May 2026 has been generated. Total spend: ¥142,800. Click to view the full breakdown.',
    time:      '3 days ago',
    date:      '2026-05-05',
    read:      true,
  },
  {
    id: '4',
    icon: Zap,
    iconColor: 'text-[var(--color-text-loss)]',
    iconBg:    'bg-[var(--color-status-loss-bg)]',
    category:  'Insight',
    title:     'Unusual expense detected',
    body:      'A dining transaction of ¥18,400 at Sukiyabashi Jiro is 3× above your average restaurant spend. Check if this should be categorized differently.',
    time:      '5 days ago',
    date:      '2026-05-03',
    read:      true,
  },
  {
    id: '5',
    icon: Check,
    iconColor: 'text-[var(--color-text-gain)]',
    iconBg:    'bg-[var(--color-status-gain-bg)]',
    category:  'Recurring',
    title:     'Recurring expenses detected',
    body:      'We found 5 new recurring transactions: Netflix (¥1,490/mo), Spotify (¥980/mo), and 3 more. Review and confirm them in the Recurring section.',
    time:      '1 week ago',
    date:      '2026-05-01',
    read:      true,
  },
]

export default function NotificationsPage() {
  const [filter,   setFilter]   = useState<NotifType>('all')
  const [readIds,  setReadIds]  = useState<Set<string>>(new Set(['3', '4', '5']))

  const displayed = NOTIFICATIONS.filter((n) =>
    filter === 'all' ? true : !readIds.has(n.id)
  )
  const unreadCount = NOTIFICATIONS.filter((n) => !readIds.has(n.id)).length

  function markAllRead() {
    setReadIds(new Set(NOTIFICATIONS.map((n) => n.id)))
  }

  function toggleRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" icon={<CheckCheck />} onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {/* Filter */}
      <div className="flex items-center justify-between">
        <SegmentedControl<NotifType>
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'all',    label: `All (${NOTIFICATIONS.length})`  },
            { value: 'unread', label: `Unread (${unreadCount})`        },
          ]}
        />
        <button className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
          <Filter className="w-3.5 h-3.5" />
          Filter by type
        </button>
      </div>

      {/* Notification list */}
      <div className="card-base overflow-hidden">
        {displayed.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-sunken)] flex items-center justify-center">
              <Bell className="w-6 h-6 text-[var(--color-text-quaternary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">All caught up</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">No unread notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {displayed.map((n) => {
              const isRead = readIds.has(n.id)
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-bg-sunken)] cursor-pointer',
                    !isRead && 'bg-[var(--color-brand-25)]'
                  )}
                  onClick={() => toggleRead(n.id)}
                >
                  {/* Icon */}
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', n.iconBg)}>
                    <n.icon className={cn('w-4 h-4', n.iconColor)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">
                          {n.category}
                        </span>
                        <p className={cn('text-sm text-[var(--color-text-primary)] mt-0.5', !isRead && 'font-semibold')}>
                          {n.title}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--color-text-quaternary)] shrink-0 mt-0.5">{n.time}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1 leading-relaxed">{n.body}</p>
                  </div>

                  {/* Unread dot */}
                  {!isRead && (
                    <div className="w-2 h-2 rounded-full bg-[var(--color-interactive-primary)] shrink-0 mt-2" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Coming soon note */}
      <p className="text-xs text-center text-[var(--color-text-quaternary)]">
        Real-time notifications via Supabase Realtime — <span className="font-medium">coming soon</span>
      </p>
    </div>
  )
}
