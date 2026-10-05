'use client'

import { supabase } from '@/lib/supabase'

// Web push on this device: the browser's subscription is stored in
// push_subscriptions; the database hands each notification to /api/push/send,
// which delivers it (see supabase/migrations/…_category_change_requests.sql).

export type PushState = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on'

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function supported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function keyBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** The worker, if registered (production builds only); null after a short wait. */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!supported()) return null
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 3000))])
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  if (!KEY) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await registration()
  if (!reg) return 'unsupported'
  const sub = await reg.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 300),
  }, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
}

/** Asks for permission and subscribes this device. Returns the new state. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  if (!KEY) return 'unconfigured'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const reg = await registration()
  if (!reg) return 'unsupported'
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }))
  await save(sub)
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return 'off'
}

/** Signed in on a device that already allowed push: make sure it is stored for this user. */
export async function refreshPushSubscription() {
  try {
    if (!supported() || Notification.permission !== 'granted') return
    const sub = await (await registration())?.pushManager.getSubscription()
    if (sub) await save(sub)
  } catch { /* best effort */ }
}
