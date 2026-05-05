'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowDownUp,
  Upload,
  BarChart3,
  Wallet,
  CalendarDays,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const { lang, setLang } = useSettingsStore()

  const NAV_ITEMS = [
    { href: '/', label: t.nav.dashboard, icon: LayoutDashboard },
    { href: '/transactions', label: t.nav.transactions, icon: ArrowDownUp },
    { href: '/calendar', label: t.nav.calendar, icon: CalendarDays },
    { href: '/groups', label: t.nav.groups, icon: Tag },
    { href: '/analytics', label: t.nav.analytics, icon: BarChart3 },
    { href: '/import', label: t.nav.import, icon: Upload },
  ]

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-brand-600 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-text-primary tracking-tight">{APP_NAME}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-brand-600' : 'text-text-muted')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: language switcher */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <div className="flex items-center gap-1.5 p-1 bg-surface rounded-[var(--radius-md)]">
          <button
            onClick={() => setLang('ja')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] transition-all',
              lang === 'ja'
                ? 'bg-white shadow-sm text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            🇯🇵 日本語
          </button>
          <button
            onClick={() => setLang('vi')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] transition-all',
              lang === 'vi'
                ? 'bg-white shadow-sm text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            🇻🇳 Tiếng Việt
          </button>
        </div>
        <p className="text-xs text-text-muted">v0.2.0 · Leo Walletly</p>
      </div>
    </aside>
  )
}
