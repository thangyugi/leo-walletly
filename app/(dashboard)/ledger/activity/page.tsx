'use client'

import { useMemo } from 'react'
import { ActivityPage } from '@/features/ledger-manage/activity-page'
import type { Person } from '@/features/ledger-manage/model'
import { useLedgerData } from '@/hooks/useLedgerData'
import { AVATAR_COLORS } from '@/lib/utils'

// Activity log of the open ledger, opened from "Ledger management".
export default function LedgerActivityPage() {
  const { ledger, members, categories, accountOf } = useLedgerData()
  const people: Person[] = useMemo(() => members.map((m, i) => ({
    id: m.user_id, memberId: m.id, name: m.user?.display_name || m.user?.email?.split('@')[0] || '—', email: m.user?.email ?? '',
    color: m.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length], role: m.role_code, joinedAt: m.joined_at,
  })), [members])
  if (!ledger) return null
  return (
    <div className="animate-fade-in">
      <ActivityPage ledgerId={ledger.id} people={people} categories={categories} accountName={(id) => accountOf(id)?.name} />
    </div>
  )
}
