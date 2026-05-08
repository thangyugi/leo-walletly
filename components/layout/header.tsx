'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, LayoutDashboard, ArrowDownUp, Upload, BarChart3, CalendarDays, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'

export function MobileHeader() {
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
    <>
      {/* Top bar */}
      <header className="md:hidden flex items-center gap-2 px-4 h-14 bg-white border-b border-border sticky top-0 z-30">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
          <Wallet className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-text-primary text-sm tracking-tight">{APP_NAME}</span>
        <div className="ml-auto flex items-center gap-1 bg-surface rounded-lg p-0.5">
          <button
            onClick={() => setLang('ja')}
            className={cn(
              'px-2 py-1 text-[10px] font-semibold rounded-lg transition-all',
              lang === 'ja' ? 'bg-white text-text-primary' : 'text-text-muted'
            )}
          >
            🇯🇵 JP
          </button>
          <button
            onClick={() => setLang('vi')}
            className={cn(
              'px-2 py-1 text-[10px] font-semibold rounded-lg transition-all',
              lang === 'vi' ? 'bg-white text-text-primary' : 'text-text-muted'
            )}
          >
            🇻🇳 VI
          </button>
        </div>
      </header>

      {/* Bottom nav — scrollable for 6 items */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border flex overflow-x-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-shrink-0 flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[56px] text-[10px] font-medium transition-colors',
                active ? 'text-brand-600' : 'text-text-muted'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
