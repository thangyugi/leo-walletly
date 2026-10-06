'use client'

import Link from 'next/link'
import { ChevronRight, LogOut } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useSignOut } from '@/hooks/useSignOut'
import { useAuthStore } from '@/stores/auth'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { SETTINGS_SECTIONS } from '../nav'

/**
 * "Personal settings" (opened from the avatar, top right): who is signed in,
 * every settings page in grouped lists, and sign out. Same look as the phone
 * "More" sheet; two columns of groups on wide screens.
 */
export function SettingsHub() {
  const { t, tk } = useTranslation()
  const signOut = useSignOut()
  const user = useAuthStore((s) => s.user)
  const profile = useLedgerStore((s) => s.profile)
  const name = profile?.display_name ?? user?.email?.split('@')[0] ?? ''

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">{tk('settingsHub.title')}</h1>
        <p className="text-sm text-[var(--color-text-tertiary)]">{tk('settingsHub.subtitle')}</p>
      </header>

      <Link href="/settings/profile"
        className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] transition-colors">
        <span className="w-14 h-14 rounded-full bg-[var(--color-interactive-primary)] text-white text-xl font-bold flex items-center justify-center shrink-0">
          {(name[0] ?? '?').toUpperCase()}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-semibold text-[var(--color-text-primary)] truncate">{name}</span>
          <span className="block text-sm text-[var(--color-text-tertiary)] truncate">{user?.email}</span>
          <span className="block mt-0.5 text-xs font-medium text-[var(--color-text-brand)]">{tk('settingsHub.editProfile')}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-[var(--color-text-quaternary)]" />
      </Link>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {SETTINGS_SECTIONS.map((section) => (
          <section key={section.id}>
            <h2 className="mb-1.5 ml-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-quaternary)]">{tk(section.titleKey)}</h2>
            <div className="rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] overflow-hidden divide-y divide-[var(--color-border-subtle)]">
              {section.items.map(({ href, labelKey, icon: Icon }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 min-h-[52px] px-4 text-[14.5px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)] transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] flex items-center justify-center shrink-0"><Icon className="w-[17px] h-[17px]" /></span>
                  <span className="flex-1">{tk(labelKey)}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)]" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <button type="button" onClick={() => void signOut()}
        className="w-full lg:w-auto lg:px-8 h-12 rounded-2xl border border-[var(--color-status-loss-bg)] bg-[var(--color-surface-default)] text-sm font-semibold text-[var(--color-text-loss)] flex items-center justify-center gap-2 hover:bg-[var(--color-status-loss-bg)] transition-colors">
        <LogOut className="w-4 h-4" />{t.common.signOut}
      </button>
      <p className="text-center lg:text-left text-[11px] text-[var(--color-text-quaternary)] tabular-nums">Walletly · {process.env.NEXT_PUBLIC_BUILD_ID}</p>
    </div>
  )
}
