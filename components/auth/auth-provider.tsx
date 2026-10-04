'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { useI18nStore } from '@/features/i18n/store'
import { useNotificationsStore } from '@/features/notifications/store'
import { supabase } from '@/lib/supabase'
import { AppSplash } from '@/components/app-splash'

// The language saved in this browser is only known once the persisted settings
// store has hydrated (the server renders with the default language).
const subscribeHydration = (cb: () => void) => useSettingsStore.persist.onFinishHydration(cb)
const isHydrated = () => useSettingsStore.persist.hasHydrated()

/** Longest wait for the UI texts of the language before showing the built-in copy. */
const TEXTS_TIMEOUT_MS = 2500

const PUBLIC_PATHS = ['/login', '/join', '/reset-password', '/offline']

// A failed e-mail link (expired / already used) lands on the Site URL with the
// error in the hash. Read it when this module loads, before the auth client
// clears the hash, so the login page can say what happened and offer a resend.
/** The password-reset link the page was opened with was expired or already used. */
export let recoveryLinkFailed = false

function readAuthError(): string | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  if (!hash.includes('error_code=')) return null
  const p = new URLSearchParams(hash.slice(1))
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  // A password-reset link that failed: the reset page says so (even when another session is open).
  if (window.location.pathname === '/reset-password') { recoveryLinkFailed = true; return null }
  return `/login?auth_error=${encodeURIComponent(p.get('error_code') ?? 'error')}&auth_msg=${encodeURIComponent(p.get('error_description') ?? '')}`
}
let pendingAuthError = readAuthError()

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
  const ledgerError = useLedgerStore((s) => s.error)
  const ledgerLoading = useLedgerStore((s) => s.loading)
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
    else { resetLedger(); useMasterStore.getState().reset() }
  }, [authReady, user, initLedger, resetLedger])

  // Loading failed while offline: try again as soon as the network is back.
  useEffect(() => {
    if (!ledgerError || !user) return
    const retry = () => void initLedger()
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [ledgerError, user, initLedger])

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
        .then(({ error }) => { if (error) console.warn('record_session failed:', error.message) })
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
    if (pathname === '/offline') return
    if (!user) {
      if (pendingAuthError) { router.replace(pendingAuthError); pendingAuthError = null; return }
      if (pathname === '/reset-password') return
      if (!isPublic) router.replace(`/login${pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : ''}`)
      return
    }
    if (!ledgerReady || ledgerLoading) return
    if (pathname === '/join' || pathname === '/reset-password') return
    // Ledgers could not be loaded (offline, network error): stay where we are
    // instead of treating the account as new.
    if (ledgerError) return
    if (ledgers.length === 0) {
      if (pathname !== '/onboarding') router.replace('/onboarding')
      return
    }
    if (pathname === '/login' || pathname === '/onboarding') {
      router.replace(preferences?.start_page || '/')
    }
  }, [authReady, ledgerReady, user, ledgers.length, pathname, isPublic, router, preferences?.start_page, ledgerError, ledgerLoading])

  // Launch screen: the app appears once it can draw in the right language with
  // the user's data — never the default language first, then a switch.
  const hydrated = useSyncExternalStore(subscribeHydration, isHydrated, () => false)
  const textsLoadedFor = useI18nStore((s) => s.loadedKey)
  const [textsTimedOut, setTextsTimedOut] = useState(false)
  useEffect(() => {
    if (!hydrated) return
    const id = setTimeout(() => setTextsTimedOut(true), TEXTS_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [hydrated])
  useEffect(() => { if (hydrated) document.documentElement.lang = lang }, [hydrated, lang])

  const textsReady = textsTimedOut || textsLoadedFor?.startsWith(`${lang}:`) ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  const ready = hydrated && (pathname === '/offline' || (authReady && (!user || ledgerReady) && textsReady))
  const [booted, setBooted] = useState(false)
  if (ready && !booted) setBooted(true)

  return (
    <>
      {booted && children}
      <AppSplash visible={!booted} />
    </>
  )
}
