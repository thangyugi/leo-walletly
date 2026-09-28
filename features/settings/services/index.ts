import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/supabase'

// Profile and preferences live in useLedgerStore (profile / preferences /
// updatePreferences). This service covers the rest of the settings screens.

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export type SessionRow = Tables<'user_sessions'>
export type NotificationSetting = { category_code: string; channel_code: string; is_enabled: boolean; is_mandatory: boolean; is_available: boolean }
export interface AuditEntry extends Tables<'audit_logs'> {
  actor: { display_name: string; email: string } | null
  changes: Tables<'audit_log_changes'>[]
}
export type DataRequest = Tables<'data_requests'>

export const SettingsService = {
  async updateProfile(userId: string, patch: Partial<Pick<Tables<'users'>, 'display_name' | 'first_name' | 'last_name' | 'phone' | 'birth_date' | 'gender' | 'country_code' | 'avatar_path'>>) {
    fail((await supabase.from('users').update(patch).eq('id', userId)).error)
  },

  /** avatars/{user_id}/avatar-<ts>.<ext>, public bucket. Returns the stored path. */
  async uploadAvatar(userId: string, file: File) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `${userId}/avatar-${Date.now()}.${ext}`
    fail((await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })).error)
    await SettingsService.updateProfile(userId, { avatar_path: path })
    return path
  },

  avatarUrl(path: string | null | undefined) {
    return path ? supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl : null
  },

  async getSessions(userId: string): Promise<SessionRow[]> {
    const { data, error } = await supabase.from('user_sessions').select('*').eq('user_id', userId).is('revoked_at', null).order('last_active_at', { ascending: false })
    fail(error)
    return data ?? []
  },

  async revokeSession(sessionId: string) {
    fail((await supabase.rpc('revoke_session', { p_session_id: sessionId })).error)
  },

  async setTrusted(sessionId: string, trusted: boolean) {
    fail((await supabase.from('user_sessions').update({ is_trusted: trusted }).eq('id', sessionId)).error)
  },

  async getNotificationSettings(userId: string): Promise<NotificationSetting[]> {
    const { data, error } = await supabase.from('v_notification_settings').select('*').eq('user_id', userId)
    fail(error)
    return (data ?? []).map((r) => ({
      category_code: r.category_code ?? '', channel_code: r.channel_code ?? '',
      is_enabled: !!r.is_enabled, is_mandatory: !!r.is_mandatory, is_available: !!r.is_available,
    }))
  },

  async setNotificationSetting(userId: string, categoryCode: string, channelCode: string, enabled: boolean) {
    fail((await supabase.from('user_notification_settings').upsert(
      { user_id: userId, category_code: categoryCode, channel_code: channelCode, is_enabled: enabled },
      { onConflict: 'user_id,category_code,channel_code' },
    )).error)
  },

  async getAuditLogs(ledgerId: string, opts: { limit?: number; before?: number; entityType?: string } = {}): Promise<AuditEntry[]> {
    let q = supabase.from('audit_logs')
      .select('*, actor:users!audit_logs_actor_user_id_fkey(display_name, email), changes:audit_log_changes(*)')
      .eq('ledger_id', ledgerId)
      .order('id', { ascending: false })
      .limit(opts.limit ?? 50)
    if (opts.before) q = q.lt('id', opts.before)
    if (opts.entityType) q = q.eq('entity_type', opts.entityType)
    const { data, error } = await q
    fail(error)
    return (data ?? []) as unknown as AuditEntry[]
  },

  async getDataRequests(userId: string): Promise<DataRequest[]> {
    const { data, error } = await supabase.from('data_requests').select('*').eq('user_id', userId).order('requested_at', { ascending: false })
    fail(error)
    return data ?? []
  },

  async requestExport(userId: string) {
    fail((await supabase.from('data_requests').insert({ user_id: userId, request_type: 'export' })).error)
  },

  async deleteMyAccount() {
    fail((await supabase.rpc('delete_my_account')).error)
    await supabase.auth.signOut()
  },
}
