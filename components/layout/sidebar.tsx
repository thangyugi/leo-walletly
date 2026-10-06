'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import { useMasterStore } from '@/features/master/store'
import { LedgerSwitcher } from '@/features/user-management/components/ledger-switcher'
import { EditableText } from '@/components/i18n/editable-text'
import { NAV_ITEMS, NAV_GROUP_LABEL_KEY, isActivePath, type NavGroup } from './nav'
import { NavBadge } from './nav-badge'
import { InstallAppButton } from '@/features/pwa/components/install-app-button'
import type { Lang } from '@/lib/i18n'

// Shown before the DB language list has loaded (and if it cannot be reached).
const FALLBACK_LANGUAGES = [
  { code: 'ja', native_name: '日本語', short_label: '日本' },
  { code: 'vi', native_name: 'Tiếng Việt', short_label: 'VN' },
  { code: 'en', native_name: 'English', short_label: 'US' },
]

export function LanguagePicker({ className, vertical }: { className?: string; vertical?: boolean }) {
  const { lang, setLang } = useSettingsStore()
  const dbLanguages = useMasterStore((s) => s.languages)
  const languages = dbLanguages.length ? dbLanguages : FALLBACK_LANGUAGES
  return (
    <div className={cn('grid gap-1', className)} style={{ gridTemplateColumns: vertical ? '1fr' : `repeat(${Math.min(languages.length, 4)}, minmax(0, 1fr))` }}>
      {languages.map((opt) => (
        <button
          key={opt.code}
          type="button"
          onClick={() => setLang(opt.code as Lang)}
          title={opt.native_name}
          aria-pressed={lang === opt.code}
          className={cn(
            'flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-all duration-100',
            lang === opt.code
              ? 'bg-[var(--color-interactive-primary)] text-white shadow-sm'
              : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-sidebar-item-hover)]'
          )}
        >
          <span className="text-[11px] font-semibold leading-none">{opt.short_label}</span>
          <span className={cn('text-[9px] font-bold uppercase tracking-wide leading-none', lang === opt.code ? 'text-white/80' : 'text-[var(--color-text-quaternary)]')}>
            {opt.code}
          </span>
        </button>
      ))}
    </div>
  )
}

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { tk } = useTranslation()
  const groups = (['main', 'manage', 'tools', 'system'] as NavGroup[]).filter((g) => NAV_ITEMS.some((n) => n.group === g))
  return (
    <>
      {groups.map((group) => (
        <div key={group} className={cn(group !== 'main' && 'mt-5')}>
          {NAV_GROUP_LABEL_KEY[group] && (
            <p className="px-2.5 mb-1 text-[10px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-widest">
              {tk(NAV_GROUP_LABEL_KEY[group])}
            </p>
          )}
          <div className="space-y-0.5">
            {NAV_ITEMS.filter((n) => n.group === group).map(({ href, labelKey, icon: Icon }) => {
              const active = isActivePath(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-100',
                    active
                      ? 'bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)] font-medium'
                      : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-text-secondary)]'
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[var(--color-interactive-primary)]" />}
                  <Icon
                    className={cn('w-4 h-4 shrink-0', active ? 'text-[var(--color-sidebar-item-active-text)]' : 'text-[var(--color-text-quaternary)] group-hover:text-[var(--color-text-secondary)]')}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  <EditableText k={labelKey} />
                  <NavBadge href={href} className="ml-auto" />
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

/** Tablet (md–lg): icons with short labels, so the page keeps most of the width. */
function RailNav() {
  const pathname = usePathname()
  const { tk } = useTranslation()
  const groups = (['main', 'manage', 'tools', 'system'] as NavGroup[]).filter((g) => NAV_ITEMS.some((n) => n.group === g))
  return (
    <nav className="flex-1 w-full overflow-y-auto px-1.5 pb-2" aria-label="main">
      {groups.map((group, gi) => (
        <div key={group} className={cn('flex flex-col items-center gap-0.5 py-1.5', gi > 0 && 'border-t border-[var(--color-sidebar-border)]')}>
          {NAV_ITEMS.filter((n) => n.group === group).map(({ href, labelKey, shortKey, icon: Icon }) => {
            const active = isActivePath(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                title={tk(labelKey)}
                aria-label={tk(labelKey)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'w-full min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-1 px-0.5 transition-colors',
                  active
                    ? 'bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)]'
                    : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-text-secondary)]',
                )}
              >
                <span className="relative">
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.1 : 1.75} />
                  <NavBadge href={href} dot className="absolute -top-0.5 -right-1" />
                </span>
                <span className="text-[10px] font-semibold leading-tight text-center line-clamp-2">{tk(shortKey)}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function Sidebar() {
  const { t } = useTranslation()
  return (
    <aside className="hidden md:flex flex-col md:w-[76px] lg:w-56 h-dvh overflow-hidden bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] shrink-0">
      {/* Tablet rail */}
      <div className="flex lg:hidden flex-col items-center flex-1 min-h-0 pt-3">
        <Link href="/" aria-label={APP_NAME} className="w-9 h-9 mb-3 rounded-[10px] bg-[var(--color-interactive-primary)] flex items-center justify-center shrink-0">
          <Wallet className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
        </Link>
        <LedgerSwitcher variant="rail" />
        <RailNav />
        <InstallAppButton variant="rail" />
        <div className="w-full px-2 py-2 border-t border-[var(--color-sidebar-border)]">
          <LanguagePicker vertical />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0">
      <Link href="/" className="flex items-center gap-2.5 px-4 h-14">
        <div className="w-7 h-7 rounded-lg bg-[var(--color-interactive-primary)] flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-sm text-[var(--color-text-primary)] tracking-tight">{APP_NAME}</span>
      </Link>

      <LedgerSwitcher />

      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <NavList />
      </nav>

      <InstallAppButton variant="sidebar" />
      <div className="px-2.5 py-3 border-t border-[var(--color-sidebar-border)]">
        <p className="flex items-center gap-1.5 px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-quaternary)]">
          <Globe className="w-3 h-3" />
          {t.common.language}
        </p>
        <LanguagePicker />
        <p className="mt-2.5 px-2 text-[10px] text-[var(--color-text-quaternary)]">v0.3.0 · {APP_NAME}</p>
      </div>
      </div>
    </aside>
  )
}
