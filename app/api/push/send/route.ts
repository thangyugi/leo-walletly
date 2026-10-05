import { timingSafeEqual } from 'node:crypto'
import webpush from 'web-push'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/push/send — called by the database (pg_net, trigger
 * tg_notifications_push) for each new notification a user wants as push.
 * Body: { id, title, body, url, tag, subscriptions: [{ endpoint, keys: { p256dh, auth } }] }
 * Header X-Push-Secret must equal PUSH_WEBHOOK_SECRET (= private.app_settings
 * 'push_secret'). The route holds no database credentials: devices the push
 * service no longer knows are reported back with push_forget(secret, …).
 */
type Body = {
  id?: string; title?: string; body?: string; url?: string; tag?: string
  subscriptions?: { endpoint: string; keys: { p256dh: string; auth: string } }[]
}

function sameSecret(a: string | null, b: string | undefined) {
  if (!a || !b) return false
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env
  if (!secret || !pub || !priv) return Response.json({ error: 'push not configured' }, { status: 503 })
  if (!sameSecret(request.headers.get('x-push-secret'), secret)) return Response.json({ error: 'forbidden' }, { status: 403 })

  let body: Body
  try { body = await request.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }
  const subs = Array.isArray(body.subscriptions) ? body.subscriptions.slice(0, 20) : []
  if (!subs.length) return Response.json({ sent: 0 })

  webpush.setVapidDetails(subject || 'mailto:admin@example.com', pub, priv)
  const payload = JSON.stringify({
    title: String(body.title ?? '').slice(0, 200),
    body: String(body.body ?? '').slice(0, 500),
    // Only paths inside the app.
    url: typeof body.url === 'string' && body.url.startsWith('/') ? body.url : '/notifications',
    tag: String(body.tag ?? body.id ?? '').slice(0, 100) || undefined,
  })

  const gone: string[] = []
  let sent = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(s, payload, { TTL: 60 * 60 * 24, urgency: 'high' })
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) gone.push(s.endpoint)
      else console.warn('push failed', code, (e as Error).message)
    }
  }))
  if (gone.length) await supabase.rpc('push_forget', { p_secret: secret, p_endpoints: gone })
  return Response.json({ sent, gone: gone.length })
}
