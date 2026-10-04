'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { SettingsSidebar } from './SettingsSidebar'
import { useTranslation } from '@/hooks/useTranslation'
import { SETTINGS_HUB } from '../nav'

interface SettingsLayoutProps {
  children: React.ReactNode
}

/**
 * /settings is the hub (full width). A settings page shows the side list on
 * desktop; on phones and tablets it gets an iOS-style back bar to the hub
 * ("‹ Personal settings") above its own large title.
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()
  const { tk } = useTranslation()
  const isHub = pathname === SETTINGS_HUB

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )

  if (isHub) return content

  return (
    <div className="flex flex-col lg:flex-row h-full max-w-6xl mx-auto w-full gap-0 lg:gap-8 lg:py-8 lg:px-6">
      <Link href={SETTINGS_HUB}
        className="lg:hidden self-start -ml-2 mb-3 inline-flex items-center gap-0.5 h-10 pl-1 pr-3 rounded-lg text-[15px] font-medium text-[var(--color-text-brand)] hover:bg-[var(--color-bg-sunken)] transition-colors">
        <ChevronLeft className="w-5 h-5" />{tk('settingsHub.title')}
      </Link>

      <div className="hidden lg:block lg:sticky lg:top-0 lg:self-start">
        <SettingsSidebar />
      </div>

      <main className="flex-1 min-w-0">{content}</main>
    </div>
  )
}
