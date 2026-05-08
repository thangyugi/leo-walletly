'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowDownUp, Upload, BarChart3, Wallet,
  CalendarDays, Tag, ScanLine, RefreshCw, FileText, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useTranslation } from '@/hooks/useTranslation'

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname        = usePathname()
  const { t }          = useTranslation()

  const navItems = [
    { href: '/',               label: t.nav.dashboard,    icon: LayoutDashboard },
    { href: '/transactions',   label: t.nav.transactions, icon: ArrowDownUp     },
    { href: '/calendar',       label: t.nav.calendar,     icon: CalendarDays    },
    { href: '/analytics',      label: t.nav.analytics,    icon: BarChart3       },
    { href: '/groups',         label: t.nav.groups,       icon: Tag             },
    { href: '/recurring',      label: t.nav.recurring,    icon: RefreshCw       },
    { href: '/monthly-report', label: t.nav.report,       icon: FileText        },
    { href: '/scan',           label: t.nav.scan,         icon: ScanLine        },
    { href: '/import',         label: t.nav.import,       icon: Upload          },
  ]

  return (
    <>
      <header className="md:hidden flex items-center justify-between h-14 px-4 bg-[var(--color-sidebar-bg)] border-b border-[var(--color-sidebar-border)] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-interactive-primary)] flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm text-[var(--color-text-primary)]">{APP_NAME}</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
          aria-label="Toggle navigation menu"
        >
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <nav
            className="absolute top-14 left-0 right-0 bg-[var(--color-sidebar-bg)] border-b border-[var(--color-sidebar-border)] p-3 space-y-0.5 max-h-[calc(100vh-3.5rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)] font-medium'
                      : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </>
  )
}
