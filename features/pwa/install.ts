'use client'

import { useSyncExternalStore } from 'react'

/**
 * Install state of the app, as a tiny external store:
 * - Chromium / Edge / Samsung fire `beforeinstallprompt`: we keep the event and
 *   replay it from our own "Install" button.
 * - iOS Safari has no prompt: the UI shows Share → Add to Home Screen steps.
 * - Already running installed (standalone) → nothing to offer.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallMode = 'prompt' | 'ios' | 'installed' | 'unsupported'

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

declare global {
  interface Window { __installPrompt?: Event }
}

if (typeof window !== 'undefined') {
  // The event can fire before this module loads: an inline script in the root
  // layout (INSTALL_PROMPT_CAPTURE in ./config) keeps it on window until we take it.
  if (window.__installPrompt) { deferred = window.__installPrompt as BeforeInstallPromptEvent; window.__installPrompt = undefined }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep the browser's mini-infobar out; we offer our own button
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos() {
  const ua = navigator.userAgent
  // iPadOS 13+ reports itself as a Mac with touch.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function snapshot(): InstallMode {
  if (installed || isStandalone()) return 'installed'
  if (deferred) return 'prompt'
  if (isIos()) return 'ios'
  return 'unsupported'
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  const mq = window.matchMedia('(display-mode: standalone)')
  mq.addEventListener('change', l)
  return () => { listeners.delete(l); mq.removeEventListener('change', l) }
}

/** How the app can be installed here, and the action for the Chromium prompt. */
export function useInstall() {
  const mode = useSyncExternalStore(subscribe, snapshot, () => 'unsupported' as InstallMode)
  const promptInstall = async () => {
    if (!deferred) return false
    const event = deferred
    deferred = null
    await event.prompt()
    const { outcome } = await event.userChoice
    emit()
    return outcome === 'accepted'
  }
  return { mode, promptInstall }
}
