/**
 * PWA settings shared by the manifest, the icons, the service worker
 * registration and the UI. Change the app's name / colours here.
 */
export const PWA = {
  name: 'Leo Walletly',
  shortName: 'Walletly',
  description: 'Household and shared finances: transactions, categories, receipts and imports.',
  /** Brand green (--color-interactive-primary). */
  brandColor: '#059669',
  /** Window / splash background (--color-bg-base). */
  backgroundColor: '#f9fafb',
  /** Browser UI colour: matches the top bar (--color-sidebar-bg) in each theme. */
  themeColor: { light: '#fafafa', dark: '#111417' },
  /** Built by app/serwist/[path]/route.ts from app/sw.ts. */
  swUrl: '/serwist/sw.js',
  /** Page the worker serves when a page is requested offline and is not cached. */
  offlineUrl: '/offline',
} as const

/** Installable icons, served by app/pwa-icons/[name]/route.tsx. */
export const PWA_ICONS = {
  'icon-192.png': { size: 192, maskable: false },
  'icon-512.png': { size: 512, maskable: false },
  'maskable-512.png': { size: 512, maskable: true },
} as const
export type PwaIconName = keyof typeof PWA_ICONS

/** Inline <head> script: catches `beforeinstallprompt` before the app's JS runs. */
export const INSTALL_PROMPT_CAPTURE =
  "addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e},{once:true})"
