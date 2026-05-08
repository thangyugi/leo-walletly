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
  ScanLine,
  RefreshCw,
  FileText,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import type { Lang } from '@/lib/i18n'

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t }   = useTranslation()
  const { lang, setLang } = useSettingsStore()

  const navItems = [
    { href: '/',               label: t.nav.dashboard,    icon: LayoutDashboard, group: 'main' },
    { href: '/transactions',   label: t.nav.transactions, icon: ArrowDownUp,     group: 'main' },
    { href: '/calendar',       label: t.nav.calendar,     icon: CalendarDays,    group: 'main' },
    { href: '/analytics',      label: t.nav.analytics,    icon: BarChart3,       group: 'main' },
    { href: '/groups',         label: t.nav.groups,       icon: Tag,             group: 'manage' },
    { href: '/recurring',      label: t.nav.recurring,    icon: RefreshCw,       group: 'manage' },
    { href: '/monthly-report', label: t.nav.report,       icon: FileText,        group: 'manage' },
    { href: '/scan',           label: t.nav.scan,         icon: ScanLine,        group: 'tools' },
    { href: '/import',         label: t.nav.import,       icon: Upload,          group: 'tools' },
  ]

  const groups = [
    { key: 'main',   label: null },
    { key: 'manage', label: 'MANAGE' },
    { key: 'tools',  label: 'TOOLS' },
  ]

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[var(--color-sidebar-border)]">
        <div className="w-7 h-7 rounded-lg bg-[var(--color-interactive-primary)] flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-sm text-[var(--color-text-primary)] tracking-tight">{APP_NAME}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        {groups.map(({ key, label }) => {
          const items = navItems.filter((n) => n.group === key)
          return (
            <div key={key} className={cn(key !== 'main' && 'mt-5')}>
              {label && (
                <p className="px-2.5 mb-1 text-[10px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-widest">
                  {label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== '/' && pathname.startsWith(href))
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-100',
                        active
                          ? 'bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)] font-medium'
                          : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-text-secondary)]'
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[var(--color-interactive-primary)]" />
                      )}
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors duration-100',
                          active
                            ? 'text-[var(--color-sidebar-item-active-text)]'
                            : 'text-[var(--color-text-quaternary)] group-hover:text-[var(--color-text-secondary)]'
                        )}
                        strokeWidth={active ? 2 : 1.75}
                      />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer: language + version */}
      <div className="px-2.5 py-3 border-t border-[var(--color-sidebar-border)]">
        <p className="flex items-center gap-1.5 px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-quaternary)]">
          <Globe className="w-3 h-3" />
          Language
        </p>
        <div className="grid grid-cols-3 gap-1">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLang(opt.value)}
              title={opt.label}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-all duration-100',
                lang === opt.value
                  ? 'bg-[var(--color-interactive-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-quaternary)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-text-tertiary)]'
              )}
            >
              <span className="text-sm leading-none">{opt.flag}</span>
              <span className={cn('text-[9px] font-bold uppercase tracking-wide leading-none',
                lang === opt.value ? 'text-white/80' : 'text-[var(--color-text-quaternary)]'
              )}>
                {opt.value}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2.5 px-2 text-[10px] text-[var(--color-text-quaternary)]">v0.3.0 · Leo Walletly</p>
      </div>
    </aside>
  )
}
