import type { LucideIcon } from 'lucide-react'
import {
  User, Settings, ShieldCheck, Monitor, Palette, Globe, Bell,
  Building2, Type, History, Lock, Languages, Code2,
} from 'lucide-react'

export interface SettingsItem {
  href: string
  /** Text key of the label (tk). */
  labelKey: string
  icon: LucideIcon
}

export interface SettingsSection {
  id: 'account' | 'preferences' | 'ledger' | 'advanced'
  titleKey: string
  items: SettingsItem[]
}

/**
 * The personal settings, grouped the way people look for them: who I am,
 * how the app looks and talks to me, the ledger I have open, then data and
 * rarely used tools. Members are managed from the main navigation (/users).
 * Used by the hub (/settings), the desktop side list and the phone back bar.
 */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'account',
    titleKey: 'settingsHub.sectionAccount',
    items: [
      { href: '/settings/profile', labelKey: 'settings.sidebar.profile', icon: User },
      { href: '/settings/account', labelKey: 'settings.sidebar.account', icon: Settings },
      { href: '/settings/security', labelKey: 'settings.sidebar.security', icon: ShieldCheck },
      { href: '/settings/devices', labelKey: 'settings.sidebar.devices', icon: Monitor },
    ],
  },
  {
    id: 'preferences',
    titleKey: 'settingsHub.sectionPreferences',
    items: [
      { href: '/settings/appearance', labelKey: 'settings.sidebar.appearance', icon: Palette },
      { href: '/settings/localization', labelKey: 'settings.sidebar.localization', icon: Globe },
      { href: '/settings/notifications', labelKey: 'settings.sidebar.notifications', icon: Bell },
    ],
  },
  {
    id: 'ledger',
    titleKey: 'settingsHub.sectionLedger',
    items: [
      { href: '/settings/ledger', labelKey: 'settingsNav.ledger', icon: Building2 },
      { href: '/settings/texts', labelKey: 'settingsNav.texts', icon: Type },
      { href: '/settings/audit-log', labelKey: 'settings.sidebar.auditLog', icon: History },
    ],
  },
  {
    id: 'advanced',
    titleKey: 'settingsHub.sectionAdvanced',
    items: [
      { href: '/settings/privacy', labelKey: 'settings.sidebar.privacy', icon: Lock },
      { href: '/settings/languages', labelKey: 'settingsNav.languages', icon: Languages },
      { href: '/settings/developer', labelKey: 'settingsNav.developer', icon: Code2 },
    ],
  },
]

export const SETTINGS_HUB = '/settings'

export function findSettingsItem(pathname: string) {
  for (const s of SETTINGS_SECTIONS) for (const i of s.items) if (pathname === i.href || pathname.startsWith(i.href + '/')) return i
  return null
}
