/// <reference lib="webworker" />
/**
 * Leo Walletly service worker. Bundled by app/serwist/[path]/route.ts and
 * served at /serwist/sw.js. Type-checked with tsconfig.sw.json.
 *
 * Caching policy (see docs/guides/pwa.md):
 * - App shell (/_next/static, icons, the offline page) is precached per build.
 * - Pages and other same-origin assets: Serwist's Next.js defaults
 *   (network first for pages, cache first for hashed JS, …).
 * - Financial data never touches the worker or Cache Storage: Supabase calls
 *   and /api routes are left to the browser (no respondWith at all).
 */
import { defaultCache } from '@serwist/turbopack/worker'
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}
declare const self: ServiceWorkerGlobalScope

const OFFLINE_URL = '/offline'

/** Requests that carry user data: Supabase (REST, Auth, Storage) and our /api routes. */
function isPrivateData(request: Request) {
  const url = new URL(request.url)
  return (
    request.headers.has('apikey') ||
    /\.supabase\.(co|in)$/.test(url.hostname) ||
    url.port === '54321' || // local `supabase start`
    (url.origin === self.location.origin && url.pathname.startsWith('/api/'))
  )
}

// Registered before Serwist's own listener: stopping the event here means no
// respondWith, so the browser performs these requests itself, uncached.
self.addEventListener('fetch', (event) => {
  if (isPrivateData(event.request)) event.stopImmediatePropagation()
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  // A new version waits until the user accepts the "update" prompt (PwaProvider).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [{ url: OFFLINE_URL, matcher: ({ request }) => request.destination === 'document' }],
  },
})

serwist.addEventListeners()

// Web push: the server (app/api/push/send) sends { title, body, url, tag }.
// Shown even when no tab is open; tapping it focuses an open tab or opens one.
self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {}
  try { data = event.data?.json() ?? {} } catch { data = { body: event.data?.text() } }
  event.waitUntil(self.registration.showNotification(data.title || 'Leo Walletly', {
    body: data.body,
    tag: data.tag,
    icon: '/pwa-icons/icon-192.png',
    data: { url: data.url || '/notifications' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data as { url?: string } | null)?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const same = tabs.find((c) => new URL(c.url).origin === self.location.origin) as WindowClient | undefined
    if (same) {
      await same.focus()
      return same.navigate(url)
    }
    return self.clients.openWindow(url)
  })())
})
