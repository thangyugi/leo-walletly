/**
 * Offline reading for the installed app.
 *
 * Every read the app makes to the database (table selects and the read-only
 * RPCs below) goes through `offlineFetch`: online it goes to the network and a
 * copy of the answer is kept on this device (Cache Storage, per signed-in user);
 * offline, or when the network fails, the last copy is returned instead. Writes
 * never pretend to succeed: offline they fail at once with a clear message.
 * The copies are deleted on sign-out.
 */

const CACHE = 'leo-offline-data-v1'

/** RPCs that only read; their answers may be reused offline. */
const READ_RPCS = new Set([
  'get_ui_texts', 'my_permissions', 'ledger_member_summary', 'member_activity', 'ledger_activity',
  'notification_detail', 'classification_period_stats', 'category_period_stats', 'category_history',
  'account_labels', 'recurring_first_on_or_after',
])

const OFFLINE_MSG: Record<string, string> = {
  ja: 'オフラインのため保存できません。接続が戻ってからもう一度お試しください。',
  vi: 'Đang ngoại tuyến nên chưa lưu được. Hãy thử lại khi có mạng.',
  en: 'You are offline, so this could not be saved. Try again when you are back online.',
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

function lang(): string {
  try { return JSON.parse(localStorage.getItem('leo-walletly-settings') ?? '{}')?.state?.lang ?? 'ja' } catch { return 'ja' }
}

/** The signed-in user of a request (JWT `sub`), so two people on one device never share copies. */
function userOf(headers: Headers): string {
  const token = headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.sub === 'string' ? payload.sub : 'anon'
  } catch { return 'anon' }
}

async function cacheKey(req: Request, body: string) {
  const data = new TextEncoder().encode(`${req.method} ${req.url} ${req.headers.get('accept') ?? ''} ${req.headers.get('prefer') ?? ''} ${body}`)
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `https://offline.leo-walletly.local/${userOf(req.headers)}/${hash}`
}

async function fromCache(key: string) {
  try {
    const hit = await (await caches.open(CACHE)).match(key)
    if (!hit) return null
    // Stored as 200 (see store); give the page the status it got online.
    const status = Number(hit.headers.get('x-offline-status')) || hit.status
    return status === hit.status ? hit : new Response(hit.body, { status, headers: hit.headers })
  } catch { return null }
}

/** Cache Storage refuses 206 (a page of rows with a count): keep it as 200 and remember the real status. */
async function store(key: string, res: Response) {
  try {
    const headers = new Headers(res.headers)
    headers.set('x-offline-status', String(res.status))
    const copy = new Response(await res.blob(), { status: 200, headers })
    await (await caches.open(CACHE)).put(key, copy)
  } catch { /* quota or private mode: just no copy */ }
}

export const offlineFetch: typeof fetch = async (input, init) => {
  const req = new Request(input, init)
  const path = new URL(req.url).pathname
  if (!path.startsWith('/rest/v1/') || typeof caches === 'undefined' || !globalThis.crypto?.subtle) return fetch(req)

  const rpc = path.startsWith('/rest/v1/rpc/') ? path.slice('/rest/v1/rpc/'.length) : null
  const read = req.method === 'GET' || req.method === 'HEAD' || (rpc !== null && READ_RPCS.has(rpc))
  if (!read) {
    if (isOffline()) {
      return new Response(JSON.stringify({ message: OFFLINE_MSG[lang()] ?? OFFLINE_MSG.en, code: 'OFFLINE' }),
        { status: 503, headers: { 'content-type': 'application/json' } })
    }
    return fetch(req)
  }

  const body = req.method === 'POST' ? await req.clone().text() : ''
  const key = await cacheKey(req, body)
  if (isOffline()) {
    const hit = await fromCache(key)
    if (hit) return hit
  }
  try {
    const res = await fetch(req)
    if (res.ok) void store(key, res.clone())
    return res
  } catch (e) {
    // The network failed (flaky connection): the last copy beats an error.
    const hit = await fromCache(key)
    if (hit) return hit
    throw e
  }
}

/** Forget every copy (sign-out, account switch). */
export async function clearOfflineCache() {
  try { if (typeof caches !== 'undefined') await caches.delete(CACHE) } catch { /* nothing kept */ }
}

/**
 * The session stored on this device, read without the network. Offline the
 * auth client would otherwise try to refresh an expired token for ~30 s before
 * every request, which kept the app on its launch screen.
 */
export function storedSession<T>(): T | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && /^sb-.*-auth-token$/.test(k)) {
        const v = JSON.parse(localStorage.getItem(k) ?? 'null')
        if (v?.access_token && v?.user) return v as T
      }
    }
  } catch { /* storage blocked */ }
  return null
}

export { isOffline }
