'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Bell, LogOut, UserCog, Building2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth'
import { useSignOut } from '@/hooks/useSignOut'
import { useTranslation } from '@/hooks/useTranslation'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useNotificationsStore } from '@/features/notifications/store'
import { NotificationItem } from '@/features/notifications/notification-item'
import { EditableText } from '@/components/i18n/editable-text'
import { NAV_ITEMS, isActivePath } from './nav'

const EXTRA_TITLES: Record<string, string> = {
  '/notifications': 'notifications.title',
  '/settings': 'settingsHub.title',
  '/settings/profile': 'settings.sidebar.profile',
  '/settings/account': 'settings.sidebar.account',
  '/settings/security': 'settings.sidebar.security',
  '/settings/notifications': 'settings.sidebar.notifications',
  '/settings/appearance': 'settings.sidebar.appearance',
  '/settings/localization': 'settings.sidebar.localization',
  '/settings/audit-log': 'settings.sidebar.auditLog',
  '/settings/texts': 'texts.title',
  '/settings/languages': 'languagesAdmin.title',
  '/settings/devices': 'settings.sidebar.devices',
  '/settings/privacy': 'settings.sidebar.privacy',
  '/settings/connected-apps': 'settings.sidebar.connectedApps',
  '/settings/developer': 'common.developerTools',
}

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
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const signOut = useSignOut()
  const { t, tk } = useTranslation()
  const current = useLedgerStore((s) => s.current)
  const profile = useLedgerStore((s) => s.profile)
  const { items, markRead, markAllRead } = useNotificationsStore()

  const [showNotif, setShowNotif] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  useClickOutside(notifRef, () => setShowNotif(false))
  useClickOutside(userMenuRef, () => setShowUserMenu(false))

  const titleKey = EXTRA_TITLES[pathname] ?? NAV_ITEMS.find((n) => isActivePath(pathname, n.href))?.labelKey ?? 'common.overview'
  const unread = items.filter((n) => !n.readAt).length
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? ''
  const initial = (displayName[0] ?? 'L').toUpperCase()

  return (
    <header className="h-12 sticky top-0 z-[200] flex items-center justify-between px-4 lg:px-5 bg-[var(--color-sidebar-bg)] border-b border-[var(--color-sidebar-border)] shrink-0">
      <nav className="flex items-center gap-1 min-w-0 text-xs" aria-label="breadcrumb">
        <Building2 className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] shrink-0" />
        <span className="font-medium text-[var(--color-text-tertiary)] truncate max-w-[140px]">{current?.name}</span>
        <ChevronRight className="w-3 h-3 text-[var(--color-text-quaternary)] shrink-0" />
        <span className="font-semibold text-[var(--color-text-primary)]"><EditableText k={titleKey} /></span>
        {current && (
          <>
            <span className="hidden sm:inline mx-1 text-[var(--color-text-quaternary)]">·</span>
            <span className="hidden sm:inline px-2 py-1 rounded-md bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] text-[10px] font-bold text-[var(--color-interactive-primary)]">
              {current.currency_code}
            </span>
          </>
        )}
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
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.notifications.title}</p>
                  {unread > 0 && (
                    <span className="text-[10px] font-bold bg-[var(--color-interactive-primary)] text-white rounded-full px-1.5 py-px">{unread}</span>
                  )}
                </div>
                {unread > 0 && (
                  <button onClick={() => void markAllRead()} className="text-xs text-[var(--color-text-link)] hover:underline">
                    {t.notifications.markAllRead}
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border-subtle)]">
                {items.length === 0 && <p className="px-4 py-6 text-center text-xs text-[var(--color-text-quaternary)]">{t.notifications.empty}</p>}
                {items.slice(0, 5).map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    compact
                    onClick={() => {
                      void markRead(n.id)
                      setShowNotif(false)
                      if (n.actionUrl) router.push(n.actionUrl)
                    }}
                  />
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-[var(--color-border-subtle)]">
                <Link href="/notifications" onClick={() => setShowNotif(false)} className="flex items-center gap-1 text-xs text-[var(--color-text-link)] hover:underline">
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
            aria-label={displayName}
          >
            <div className="w-6 h-6 rounded-full bg-[var(--color-interactive-primary)] flex items-center justify-center text-[10px] font-bold text-white">
              {initial}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{displayName}</p>
                <p className="text-[11px] text-[var(--color-text-quaternary)] truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <MenuLink href="/settings" icon={UserCog} label={tk('settingsHub.title')} onClick={() => setShowUserMenu(false)} />
              </div>
              <div className="border-t border-[var(--color-border-subtle)] py-1">
                <button
                  onClick={() => { setShowUserMenu(false); void signOut() }}
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

function MenuLink({ href, icon: Icon, label, badge, onClick }: { href: string; icon: React.ElementType; label: string; badge?: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)] transition-colors">
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && <span className="text-[10px] font-semibold bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] text-[var(--color-text-quaternary)] px-1.5 py-0.5 rounded">{badge}</span>}
    </Link>
  )
}
