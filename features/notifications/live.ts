'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useNotificationsStore } from './store'
import { useApprovalsStore } from '@/features/approvals/store'
import { useI18nStore } from '@/features/i18n/store'
import { refreshPushSubscription } from '@/features/pwa/push'

/**
 * Keeps the bell and the proposals live while the app is open: a new
 * notification for this user reloads the list (and the proposals), and a
 * proposal waiting for this user's approval pops up a toast.
 */
export function useLiveNotifications(userId: string | null | undefined, ledgerId: string | null | undefined) {
  useEffect(() => {
    if (!userId || !ledgerId) return
    void useApprovalsStore.getState().load(ledgerId, userId)
    void refreshPushSubscription()
    const ch = supabase.channel(`notif-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, async (payload) => {
        await useNotificationsStore.getState().load()
        void useApprovalsStore.getState().reload()
        const row = payload.new as { id: string; type_code: string; action_url: string | null }
        const n = useNotificationsStore.getState().items.find((x) => x.id === row.id)
        if (row.type_code === 'category_change_requested' && n) {
          const texts = useI18nStore.getState().texts
          const title = (texts['approvals.live']?.value ?? '{{name}}').replace('{{name}}', n.params.actor ?? '')
          toast(title, {
            description: `${n.params.what ?? ''}: ${n.params.detail ?? ''}`,
            action: { label: texts['approvals.review']?.value ?? 'Review', onClick: () => { window.location.href = row.action_url ?? '/approvals' } },
          })
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [userId, ledgerId])
}
