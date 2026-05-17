import { supabase } from '@/lib/supabase'
import type { UserProfile, UserPreferences, SecuritySettings, UserSession, AuditEvent, NotificationPreference } from '../types'
import { ProfileFormValues, AccountPreferencesFormValues } from '../schemas'

export class SettingsService {
  static async getProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return {
      id: data.id,
      fullName: data.full_name,
      legalName: data.legal_name,
      avatarUrl: data.avatar_url,
      email: '', // Email usually comes from auth.users, handled in hook
      phoneNumber: data.phone_number,
      jobTitle: data.job_title,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  static async updateProfile(userId: string, values: Partial<ProfileFormValues>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: values.fullName,
        legal_name: values.legalName,
        phone_number: values.phoneNumber,
        job_title: values.jobTitle,
      })
      .eq('id', userId)

    if (error) throw error
  }

  static async getPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      console.warn('Preferences record not found or error occurred, returning defaults.', error)
      return {
        userId,
        lang: 'en',
        locale: 'en-US',
        timezone: 'UTC',
        currency: 'USD',
        dashboardDensity: 'comfortable',
        hiddenBalances: false,
        startPage: '/',
        fiscalYearStart: null,
        numberFormatting: 'standard',
        dateFormatting: 'yyyy-MM-dd'
      }
    }

    return {
      userId: data.user_id,
      lang: data.lang,
      locale: data.locale,
      timezone: data.timezone,
      currency: data.currency,
      dashboardDensity: data.dashboard_density,
      hiddenBalances: data.hidden_balances,
      startPage: data.start_page,
      fiscalYearStart: data.fiscal_year_start,
      numberFormatting: data.number_formatting,
      dateFormatting: data.date_formatting
    }
  }

  static async updatePreferences(userId: string, values: Partial<AccountPreferencesFormValues>): Promise<void> {
    const { error } = await supabase
      .from('user_preferences')
      .update({
        lang: values.lang,
        locale: values.locale,
        timezone: values.timezone,
        currency: values.currency,
        dashboard_density: values.dashboardDensity,
        hidden_balances: values.hiddenBalances,
        start_page: values.startPage
      })
      .eq('user_id', userId)

    if (error) throw error
  }

  static async getSessions(userId: string): Promise<UserSession[]> {
    const { data, error } = await supabase
      .from('device_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('last_login_at', { ascending: false })

    if (error) throw error
    return data.map(d => ({
      id: d.id,
      deviceId: d.device_id,
      deviceName: d.device_name || 'Unknown Device',
      browser: 'Chrome', // Mocked, ideally parsed from UA
      os: 'macOS',
      ipAddress: '127.0.0.1',
      location: 'Tokyo, JP',
      lastActivityAt: d.last_login_at,
      isCurrent: false, // Logic needed to compare with current session
      riskLevel: 'low'
    }))
  }

  static async revokeSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('device_verifications')
      .delete()
      .eq('id', sessionId)

    if (error) throw error
  }

  static async getAuditLogs(userId: string, limit = 50): Promise<AuditEvent[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('actor_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
 
    if (error) throw error
    return data.map(d => ({
      id: d.id,
      action: d.action,
      entityType: d.entity_type,
      entityId: d.entity_id,
      actorId: d.actor_id,
      metadata: d.metadata || {},
      ipAddress: d.actor_ip,
      userAgent: d.actor_user_agent,
      createdAt: d.created_at
    }))
  }

  static async getNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('notification_settings')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data.notification_settings
  }

  static async updateNotificationPreferences(userId: string, preferences: NotificationPreference[]): Promise<void> {
    const { error } = await supabase
      .from('user_preferences')
      .update({ notification_settings: preferences })
      .eq('user_id', userId)

    if (error) throw error
  }
}
