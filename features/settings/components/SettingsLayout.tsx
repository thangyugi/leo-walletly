'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { SettingsSidebar } from './SettingsSidebar'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

interface SettingsLayoutProps {
  children: React.ReactNode
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col lg:flex-row h-full max-w-6xl mx-auto w-full gap-0 lg:gap-8 lg:py-8 lg:px-6">
      {/* Mobile Nav (Redesigned for touch) */}
      <div className="lg:hidden mb-5 overflow-x-auto whitespace-nowrap no-scrollbar -mx-4 px-4 md:-mx-6 md:px-6 border-b border-[var(--color-border-subtle)]">
        <SettingsSidebarMobile />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:sticky lg:top-0 lg:self-start">
        <SettingsSidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

function SettingsSidebarMobile() {
  const pathname = usePathname()
  const { t } = useTranslation()
  
  const items = [
    { href: '/settings/profile', label: t.settings.sidebar.profile },
    { href: '/settings/account', label: t.settings.sidebar.account },
    { href: '/settings/security', label: t.settings.sidebar.security },
    { href: '/settings/notifications', label: t.settings.sidebar.notifications },
    { href: '/settings/appearance', label: t.settings.sidebar.appearance },
    { href: '/settings/localization', label: t.settings.sidebar.localization },
    { href: '/settings/ledger', label: t.settingsNav.ledger },
    { href: '/settings/texts', label: t.settingsNav.texts },
    { href: '/settings/languages', label: t.settingsNav.languages },
    { href: '/settings/audit-log', label: t.settings.sidebar.auditLog },
    { href: '/settings/devices', label: t.settings.sidebar.devices },
    { href: '/settings/privacy', label: t.settings.sidebar.privacy },
    { href: '/settings/developer', label: t.settingsNav.developer },
  ]

  return (
    <div className="flex gap-4 min-w-max">
      {items.map(item => (
        <Link 
          key={item.href} 
          href={item.href}
          className={cn(
            "text-sm font-medium px-2 pb-3 border-b-2 transition-all whitespace-nowrap",
            pathname === item.href 
              ? "border-[var(--color-interactive-primary)] text-[var(--color-interactive-primary)]" 
              : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}

