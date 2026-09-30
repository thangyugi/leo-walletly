'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface AppNotification {
  id: string
  typeCode: string
  ledgerId: string | null
  actionUrl: string | null
  readAt: string | null
  createdAt: string
  params: Record<string, string>
}

interface NotificationsState {
  items: AppNotification[]
  loading: boolean
  load: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  archive: (id: string) => Promise<void>
  unreadCount: () => number
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  loading: false,

  load: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('notifications')
      .select('id, type_code, ledger_id, action_url, read_at, created_at, notification_params(name, value)')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(100)
    set({
      loading: false,
      items: (data ?? []).map((n) => ({
        id: n.id,
        typeCode: n.type_code,
        ledgerId: n.ledger_id,
        actionUrl: n.action_url,
        readAt: n.read_at,
        createdAt: n.created_at,
        params: Object.fromEntries((n.notification_params ?? []).map((p) => [p.name, p.value])),
      })),
    })
  },

  markRead: async (id) => {
    const now = new Date().toISOString()
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, readAt: now } : n)) }))
    await supabase.from('notifications').update({ read_at: now }).eq('id', id)
  },

  markAllRead: async () => {
    const now = new Date().toISOString()
    const ids = get().items.filter((n) => !n.readAt).map((n) => n.id)
    if (!ids.length) return
    set((s) => ({ items: s.items.map((n) => (n.readAt ? n : { ...n, readAt: now })) }))
    await supabase.from('notifications').update({ read_at: now }).in('id', ids)
  },

  archive: async (id) => {
    set((s) => ({ items: s.items.filter((n) => n.id !== id) }))
    await supabase.from('notifications').update({ archived_at: new Date().toISOString() }).eq('id', id)
  },

  unreadCount: () => get().items.filter((n) => !n.readAt).length,
}))
