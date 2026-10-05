import type { AccessLevel, Category } from '@/features/categories/types'

export interface Person {
  /** user id */
  id: string
  /** ledger_members.id */
  memberId: string
  name: string
  email: string
  color: string
  role: string
  joinedAt: string
}

export const ACCESS_ORDER: AccessLevel[] = ['view', 'write', 'propose', 'manage']

/** A person's access to a category: owner, their share level, or null. */
export function levelOf(c: Category, userId: string): AccessLevel | 'owner' | null {
  if (c.owner_id === userId) return 'owner'
  return c.shares[userId]?.level ?? null
}

/** Split weights of everyone on a category (owner included), with a user's weight replaced. */
function weights(c: Category, override?: { userId: string; weight: number | null; remove?: boolean }) {
  const w: Record<string, number> = { [c.owner_id]: c.shares[c.owner_id]?.ratio ?? 1 }
  for (const [u, s] of Object.entries(c.shares)) w[u] = s.ratio ?? 1
  if (override) {
    if (override.remove) delete w[override.userId]
    else w[override.userId] = override.weight ?? 1
  }
  return w
}

/** Percentage of shared spending a user carries in a category (0 when not in it). */
export function sharePct(c: Category, userId: string, override?: { weight: number | null }) {
  const w = weights(c, override ? { userId, weight: override.weight } : undefined)
  if (!(userId in w)) return 0
  const total = Object.values(w).reduce((a, b) => a + b, 0)
  return total > 0 ? Math.round((w[userId] / total) * 100) : 0
}

/** The weight that gives a user `pct` percent next to everyone else's current weights. */
export function weightForPct(c: Category, userId: string, pct: number) {
  const others = Object.entries(weights(c, { userId, weight: null, remove: true })).reduce((a, [, v]) => a + v, 0)
  const p = Math.min(99, Math.max(1, pct))
  return Math.round(((p / (100 - p)) * others) * 10000) / 10000
}
