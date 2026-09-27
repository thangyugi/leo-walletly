'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { useI18nStore } from '@/features/i18n/store'
import { useNotificationsStore } from '@/features/notifications/store'
import { supabase } from '@/lib/supabase'

const PUBLIC_PATHS = ['/login', '/join']

function describeDevice() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? (/iPhone|iPad/.test(ua) ? 'iOS' : 'macOS') : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : 'Unknown'
  const type = /iPad|Tablet/.test(ua) ? 'tablet' : /Mobi|iPhone|Android/.test(ua) ? 'mobile' : 'desktop'
  return { browser, os, type, name: `${browser} · ${os}` }
}

// Boot sequence: auth session → ledger/profile → reference data + UI texts →
// route guard. Redirect rules are in docs/SCREEN_FLOWS.md §0.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, initialized: authReady, initialize: initAuth } = useAuthStore()
  const ledgerReady = useLedgerStore((s) => s.initialized)
  const initLedger = useLedgerStore((s) => s.initialize)
  const resetLedger = useLedgerStore((s) => s.reset)
  const ledgers = useLedgerStore((s) => s.ledgers)
  const current = useLedgerStore((s) => s.current)
  const preferences = useLedgerStore((s) => s.preferences)
  const lang = useSettingsStore((s) => s.lang)
  const loadTexts = useI18nStore((s) => s.load)
  const loadMaster = useMasterStore((s) => s.load)
  const loadLanguages = useMasterStore((s) => s.loadLanguages)
  const loadNotifications = useNotificationsStore((s) => s.load)
  const router = useRouter()
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.includes(pathname)

  useEffect(() => { void initAuth() }, [initAuth])
  useEffect(() => { void loadLanguages() }, [loadLanguages])

  useEffect(() => {
    if (!authReady) return
    if (user) void initLedger()
    else resetLedger()
  }, [authReady, user, initLedger, resetLedger])

  // UI texts follow the language and the open ledger (ledger-level overrides).
  useEffect(() => { void loadTexts(lang, current?.id ?? null) }, [lang, current?.id, loadTexts])

  useEffect(() => {
    if (!user || !ledgerReady) return
    void loadMaster()
    void loadNotifications()
    if (typeof window !== 'undefined' && !sessionStorage.getItem('lw-session-recorded')) {
      sessionStorage.setItem('lw-session-recorded', '1')
      const d = describeDevice()
      void supabase.rpc('record_session', { p_device_name: d.name, p_device_type: d.type, p_browser: d.browser, p_os: d.os })
    }
  }, [user, ledgerReady, loadMaster, loadNotifications])

  // Theme from user_preferences (light / dark / system).
  useEffect(() => {
    const theme = preferences?.theme ?? 'system'
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [preferences?.theme])

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      if (!isPublic) router.replace(`/login${pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : ''}`)
      return
    }
    if (!ledgerReady) return
    if (pathname === '/join') return
    if (ledgers.length === 0) {
      if (pathname !== '/onboarding') router.replace('/onboarding')
      return
    }
    if (pathname === '/login' || pathname === '/onboarding') {
      router.replace(preferences?.start_page || '/')
    }
  }, [authReady, ledgerReady, user, ledgers.length, pathname, isPublic, router, preferences?.start_page])

  const booting = !authReady || (user && !ledgerReady)
  if (booting && !isPublic) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[var(--color-brand-200)] rounded-2xl" />
          <div className="h-4 w-24 bg-[var(--color-brand-100)] rounded" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
