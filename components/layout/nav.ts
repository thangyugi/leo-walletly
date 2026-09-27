import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, ArrowDownUp, CalendarDays, BarChart3, FolderTree, Users, RefreshCw,
  FileText, ScanLine, Upload, Settings, User,
} from 'lucide-react'

export type NavGroup = 'main' | 'manage' | 'tools' | 'system'

export interface NavItem {
  href: string
  /** translation key of the label (user-editable in Settings › 表示テキスト) */
  labelKey: string
  icon: LucideIcon
  group: NavGroup
}

// Single navigation definition for Sidebar, MobileHeader and the command palette.
export const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, group: 'main' },
  { href: '/transactions', labelKey: 'nav.transactions', icon: ArrowDownUp, group: 'main' },
  { href: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays, group: 'main' },
  { href: '/analytics', labelKey: 'nav.analytics', icon: BarChart3, group: 'main' },
  { href: '/categories', labelKey: 'nav.groups', icon: FolderTree, group: 'manage' },
  { href: '/users', labelKey: 'nav.users', icon: Users, group: 'manage' },
  { href: '/recurring', labelKey: 'nav.recurring', icon: RefreshCw, group: 'manage' },
  { href: '/monthly-report', labelKey: 'nav.report', icon: FileText, group: 'manage' },
  { href: '/scan', labelKey: 'nav.scan', icon: ScanLine, group: 'tools' },
  { href: '/import', labelKey: 'nav.import', icon: Upload, group: 'tools' },
  { href: '/settings/ledger', labelKey: 'ledger_settings.title', icon: Settings, group: 'system' },
  { href: '/settings/profile', labelKey: 'settings.sidebar.profile', icon: User, group: 'system' },
]

export const NAV_GROUP_LABEL_KEY: Record<NavGroup, string | null> = {
  main: null,
  manage: 'common.manage',
  tools: 'common.tools',
  system: 'common.system',
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href))
}
