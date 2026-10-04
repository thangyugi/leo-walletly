'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { SETTINGS_SECTIONS } from '../nav'

/** Desktop side list of the settings pages (same groups as the hub). */
export function SettingsSidebar() {
  const pathname = usePathname()
  const { tk } = useTranslation()

  return (
    <nav className="w-64 shrink-0 flex flex-col gap-6 pr-4 border-r border-[var(--color-border-subtle)] h-full overflow-y-auto scrollbar-hide">
      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.id}>
          <h2 className="px-3 mb-2 text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest">{tk(section.titleKey)}</h2>
          <div className="flex flex-col gap-0.5">
            {section.items.map(({ href, labelKey, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group',
                    active
                      ? 'bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)] font-medium'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-text-primary)]',
                  )}>
                  <Icon className={cn('w-4 h-4 transition-colors', active ? 'text-[var(--color-sidebar-item-active-text)]' : 'text-[var(--color-text-quaternary)] group-hover:text-[var(--color-text-secondary)]')} />
                  {tk(labelKey)}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
