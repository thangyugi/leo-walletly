'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  ChevronRight, Bell, Settings, LogOut, User, Building2,
  Check, AlertTriangle, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { useTranslation } from '@/hooks/useTranslation'
import { CurrencyDisplay } from '@/features/currency/components/CurrencySwitcher'

function getPageLabel(pathname: string, t: any): string {
  const labels: Record<string, string> = {
    '/':                t.nav.dashboard,
    '/transactions':    t.nav.transactions,
    '/analytics':       t.nav.analytics,
    '/calendar':        t.nav.calendar,
    '/groups':          t.nav.groups,
    '/recurring':       t.nav.recurring,
    '/monthly-report':  t.nav.report,
    '/scan':            t.nav.scan,
    '/import':          t.nav.import,
    '/profile':         t.settings.sidebar.profile,
    '/notifications':   t.settings.sidebar.notifications,
    '/settings':        t.settings.sidebar.profile,
    '/settings/profile': t.settings.sidebar.profile,
    '/settings/account': t.settings.sidebar.account,
    '/settings/security': t.settings.sidebar.security,
    '/settings/notifications': t.settings.sidebar.notifications,
    '/settings/audit-log': t.settings.sidebar.auditLog,
    '/ledger':           t.ledger_settings.title,
    '/settings/ledger':  t.ledger_settings.title,
  }
  return labels[pathname] || t.common.overview
}

const DEMO_NOTIFS = [
  {
    id: '1',
    icon: AlertTriangle,
    iconColor: 'text-[var(--color-text-warning)]',
    iconBg:    'bg-[var(--color-status-warning-bg)]',
    title:     'Budget alert',
    body:      'Food & Dining is at 85% of monthly budget',
    time:      '2h ago',
    read:      false,
  },
  {
    id: '2',
    icon: Check,
    iconColor: 'text-[var(--color-text-gain)]',
    iconBg:    'bg-[var(--color-status-gain-bg)]',
    title:     'Import complete',
    body:      '128 transactions imported from CSV',
    time:      '1d ago',
    read:      false,
  },
]

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [ref, handler])
}

export function TopBar({ onSearchOpen }: { onSearchOpen?: () => void }) {
  const pathname                    = usePathname()
  const { workspaceName }           = useSettingsStore()
  const { user, signOut }           = useAuthStore()
  const { t, lang }                 = useTranslation()

  const [showNotif,    setShowNotif]    = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [readIds,      setReadIds]      = useState<Set<string>>(new Set())

  const notifRef    = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useClickOutside(notifRef,    () => setShowNotif(false))
  useClickOutside(userMenuRef, () => setShowUserMenu(false))

  const currentLabel = getPageLabel(pathname, t)
  const unread       = DEMO_NOTIFS.filter((n) => !readIds.has(n.id)).length
  const userInitial  = user?.email?.[0]?.toUpperCase() ?? 'L'
  const userEmail    = user?.email ?? 'leo@walletly.app'

  function markAllRead() {
    setReadIds(new Set(DEMO_NOTIFS.map((n) => n.id)))
  }

  return (
    <header className="h-12 sticky top-0 z-[200] flex items-center justify-between px-4 lg:px-5 bg-[var(--color-sidebar-bg)] border-b border-[var(--color-sidebar-border)] shrink-0">
      <nav className="flex items-center gap-1 min-w-0 text-xs">
        <Building2 className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] shrink-0" />
        <span className="font-medium text-[var(--color-text-tertiary)] truncate max-w-[100px]">
          {workspaceName}
        </span>
        <ChevronRight className="w-3 h-3 text-[var(--color-text-quaternary)] shrink-0" />
        <span className="font-semibold text-[var(--color-text-primary)]">{currentLabel}</span>
        <span className="hidden sm:inline mx-1 text-[var(--color-text-quaternary)]">·</span>
        <CurrencyDisplay />
      </nav>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 h-7 px-2.5 rounded-lg text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-sunken)] hover:bg-[var(--color-border-default)] transition-colors"
          aria-label={t.common.search}
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="m10.5 10.5 3 3" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">{t.common.search}</span>
          <kbd className="hidden md:inline font-mono text-[10px] bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded px-1 leading-4">⌘K</kbd>
        </button>

        <div className="relative ml-1" ref={notifRef}>
          <button
            onClick={() => { setShowNotif((v) => !v); setShowUserMenu(false) }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
            aria-label={t.notifications.title}
          >
            <Bell className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[8px] h-2 rounded-full bg-[var(--color-interactive-primary)] border-[1.5px] border-[var(--color-sidebar-bg)]" />
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-xl shadow-lg z-50 overflow-hidden animate-slide-in-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.notifications.title}
                  </p>
                  {unread > 0 && (
                    <span className="text-[10px] font-bold bg-[var(--color-interactive-primary)] text-white rounded-full px-1.5 py-px leading-none">
                      {unread}
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-[var(--color-text-link)] hover:underline"
                  >
                    {t.dashboard.markAllRead}
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {DEMO_NOTIFS.map((n) => (
                  <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer group">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', n.iconBg)}>
                      <n.icon className={cn('w-4 h-4', n.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] line-clamp-1">{n.title}</p>
                      <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-[var(--color-text-quaternary)] mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-[var(--color-border-subtle)]">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotif(false)}
                  className="flex items-center gap-1 text-xs text-[var(--color-text-link)] hover:underline"
                >
                  {t.dashboard.viewAllNotifs}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setShowUserMenu((v) => !v); setShowNotif(false) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-[var(--color-interactive-primary)] flex items-center justify-center text-[10px] font-bold text-white">
              {userInitial}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-xl shadow-lg z-50 overflow-hidden animate-slide-in-up">
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-interactive-primary)] flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {userInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                      {userEmail.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-quaternary)] mt-px">
                      {workspaceName} {t.common.workspace}
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <MenuItem
                  href="/settings/profile"
                  icon={User}
                  label={t.settings.sidebar.profile}
                  onClick={() => setShowUserMenu(false)}
                />
                <MenuItem
                  href="/settings/developer"
                  icon={Settings}
                  label={t.common.developerTools}
                  soon
                  onClick={() => setShowUserMenu(false)}
                />
              </div>

              <div className="border-t border-[var(--color-border-subtle)] py-1">
                <button
                  onClick={signOut}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)] transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {t.common.signOut}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuItem({
  href, icon: Icon, label, soon, onClick,
}: {
  href: string; icon: React.ElementType; label: string; soon?: boolean; onClick?: () => void
}) {
  const { t } = useTranslation()
  return (
    <Link
      href={href}
      onClick={soon ? (e) => e.preventDefault() : onClick}
      className={cn(
        'flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors',
        soon
          ? 'cursor-not-allowed opacity-60'
          : 'hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)]'
      )}
      aria-disabled={soon}
      tabIndex={soon ? -1 : 0}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {soon && (
        <span className="text-[10px] font-semibold bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] text-[var(--color-text-quaternary)] px-1.5 py-0.5 rounded">
          {t.placeholders.devTitle.split(' ')[0]}
        </span>
      )}
    </Link>
  )
}
