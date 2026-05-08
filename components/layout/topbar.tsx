'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  ChevronRight, Bell, Settings, LogOut, User, Building2,
  Check, AlertTriangle, Info, Zap, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'

// ------------------------------------------------------------------
// Route → Page label map for breadcrumb
// ------------------------------------------------------------------
const PAGE_LABELS: Record<string, string> = {
  '/':                'Dashboard',
  '/transactions':    'Transactions',
  '/analytics':       'Analytics',
  '/calendar':        'Calendar',
  '/groups':          'Groups',
  '/recurring':       'Recurring',
  '/monthly-report':  'Monthly Report',
  '/scan':            'Scan Receipt',
  '/import':          'Import',
  '/profile':         'Profile',
  '/notifications':   'Notifications',
}

// ------------------------------------------------------------------
// Demo notifications (replace with real data when API is ready)
// ------------------------------------------------------------------
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
  {
    id: '3',
    icon: Info,
    iconColor: 'text-[var(--color-text-info)]',
    iconBg:    'bg-[var(--color-status-info-bg)]',
    title:     'New month started',
    body:      'Your monthly report is ready to review',
    time:      '3d ago',
    read:      true,
  },
  {
    id: '4',
    icon: Zap,
    iconColor: 'text-[var(--color-text-loss)]',
    iconBg:    'bg-[var(--color-status-loss-bg)]',
    title:     'Unusual expense',
    body:      'Dining ¥18,400 is 3× above your average',
    time:      '5d ago',
    read:      true,
  },
]

// ------------------------------------------------------------------
// Hook: close on outside click
// ------------------------------------------------------------------
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [ref, handler])
}

// ------------------------------------------------------------------
// TopBar
// ------------------------------------------------------------------
export function TopBar({ onSearchOpen }: { onSearchOpen?: () => void }) {
  const pathname                    = usePathname()
  const { workspaceName, currency } = useSettingsStore()
  const { user, signOut }           = useAuthStore()

  const [showNotif,    setShowNotif]    = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [readIds,      setReadIds]      = useState<Set<string>>(new Set(['3', '4']))

  const notifRef    = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useClickOutside(notifRef,    () => setShowNotif(false))
  useClickOutside(userMenuRef, () => setShowUserMenu(false))

  const currentLabel = PAGE_LABELS[pathname] ?? 'Overview'
  const unread       = DEMO_NOTIFS.filter((n) => !readIds.has(n.id)).length
  const userInitial  = user?.email?.[0]?.toUpperCase() ?? 'L'
  const userEmail    = user?.email ?? 'leo@walletly.app'

  function markAllRead() {
    setReadIds(new Set(DEMO_NOTIFS.map((n) => n.id)))
  }

  return (
    <header className="h-12 sticky top-0 z-[200] flex items-center justify-between px-4 lg:px-5 bg-[var(--color-sidebar-bg)] border-b border-[var(--color-sidebar-border)] shrink-0">

      {/* ── Left: Breadcrumb ─────────────────────────────────────── */}
      <nav className="flex items-center gap-1 min-w-0 text-xs">
        <Building2 className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] shrink-0" />
        <span className="font-medium text-[var(--color-text-tertiary)] truncate max-w-[100px]">
          {workspaceName}
        </span>
        <ChevronRight className="w-3 h-3 text-[var(--color-text-quaternary)] shrink-0" />
        <span className="font-semibold text-[var(--color-text-primary)]">{currentLabel}</span>
        <span className="hidden sm:inline mx-1 text-[var(--color-text-quaternary)]">·</span>
        <span className="hidden sm:inline font-semibold text-[var(--color-interactive-primary)]">{currency}</span>
      </nav>

      {/* ── Right: Actions ────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 shrink-0">

        {/* Search */}
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 h-7 px-2.5 rounded-lg text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-sunken)] hover:bg-[var(--color-border-default)] transition-colors"
          aria-label="Search (⌘K)"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="m10.5 10.5 3 3" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden md:inline font-mono text-[10px] bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded px-1 leading-4">⌘K</kbd>
        </button>

        {/* Notifications */}
        <div className="relative ml-1" ref={notifRef}>
          <button
            onClick={() => { setShowNotif((v) => !v); setShowUserMenu(false) }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
            aria-label="Notifications"
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
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Notifications</p>
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
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-[var(--color-border-subtle)] max-h-72 overflow-y-auto">
                {DEMO_NOTIFS.map((n) => {
                  const isRead = readIds.has(n.id)
                  return (
                    <button
                      key={n.id}
                      onClick={() => setReadIds((prev) => new Set([...prev, n.id]))}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-bg-sunken)] transition-colors',
                        !isRead && 'bg-[var(--color-brand-25)]'
                      )}
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', n.iconBg)}>
                        <n.icon className={cn('w-3.5 h-3.5', n.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-xs font-semibold text-[var(--color-text-primary)]', !isRead && 'font-bold')}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-[var(--color-text-quaternary)] shrink-0">{n.time}</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 leading-relaxed">{n.body}</p>
                      </div>
                      {!isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-interactive-primary)] shrink-0 mt-1.5" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="px-4 py-2.5 border-t border-[var(--color-border-subtle)]">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotif(false)}
                  className="flex items-center gap-1 text-xs text-[var(--color-text-link)] hover:underline"
                >
                  View all notifications
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            onClick={() => { setShowUserMenu((v) => !v); setShowNotif(false) }}
            className="w-7 h-7 rounded-full bg-[var(--color-interactive-primary)] flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-[var(--color-brand-300)] hover:ring-offset-1 transition-all select-none"
            aria-label="User menu"
          >
            {userInitial}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-xl shadow-lg z-50 overflow-hidden animate-slide-in-up">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-interactive-primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{userEmail}</p>
                    <p className="text-[10px] text-[var(--color-text-quaternary)] mt-px">{workspaceName} workspace</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <MenuItem
                  href="/profile"
                  icon={User}
                  label="Profile"
                  soon
                  onClick={() => setShowUserMenu(false)}
                />
                <MenuItem
                  href="/settings"
                  icon={Settings}
                  label="Account Settings"
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
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ------------------------------------------------------------------
// MenuItem helper
// ------------------------------------------------------------------
function MenuItem({
  href, icon: Icon, label, soon, onClick,
}: {
  href: string; icon: React.ElementType; label: string; soon?: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors',
        soon
          ? 'cursor-not-allowed opacity-60'
          : 'hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)]'
      )}
      aria-disabled={soon}
      tabIndex={soon ? -1 : 0}
      onClick={soon ? (e) => e.preventDefault() : onClick}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {soon && (
        <span className="text-[10px] font-semibold bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] text-[var(--color-text-quaternary)] px-1.5 py-0.5 rounded">
          Soon
        </span>
      )}
    </Link>
  )
}
