'use client'

import Link from 'next/link'
import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useTranslation } from '@/hooks/useTranslation'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useNotificationsStore } from '@/features/notifications/store'
import { LedgerSwitcher } from '@/features/user-management/components/ledger-switcher'

/**
 * Phone top bar: one row instead of the logo bar + breadcrumb bar. The ledger
 * switcher doubles as the page context; navigation lives in the bottom tab bar.
 */
export function MobileHeader({ onSearchOpen }: { onSearchOpen?: () => void }) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const profile = useLedgerStore((s) => s.profile)
  const unread = useNotificationsStore((s) => s.items.filter((n) => !n.readAt).length)
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? ''
  const initial = (displayName[0] ?? 'L').toUpperCase()

  return (
    <header className="md:hidden sticky top-0 z-[200] flex items-center gap-1 h-14 pl-4 pr-2 bg-[var(--color-sidebar-bg)] border-b border-[var(--color-sidebar-border)] shrink-0">
      <div className="flex-1 min-w-0">
        <LedgerSwitcher variant="bar" />
      </div>
      <button
        type="button"
        onClick={onSearchOpen}
        aria-label={t.common.search}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
      >
        <Search className="w-[18px] h-[18px] text-[var(--color-text-secondary)]" />
      </button>
      <Link
        href="/notifications"
        aria-label={t.notifications.title}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
      >
        <Bell className="w-[18px] h-[18px] text-[var(--color-text-secondary)]" />
        {unread > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--color-interactive-primary)] border-[1.5px] border-[var(--color-sidebar-bg)]" />}
      </Link>
      <Link
        href="/settings/profile"
        aria-label={displayName}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-[var(--color-interactive-primary)] flex items-center justify-center text-[11px] font-bold text-white">{initial}</span>
      </Link>
    </header>
  )
}
