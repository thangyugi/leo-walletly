import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, ArrowDownUp, CalendarDays, BarChart3, FolderTree, BookUser, RefreshCw,
  FileText, ScanLine, Upload, Settings, Wallet, GitPullRequestArrow,
} from 'lucide-react'

export type NavGroup = 'main' | 'manage' | 'tools' | 'system'

export interface NavItem {
  href: string
  /** translation key of the label (user-editable in Settings › 表示テキスト) */
  labelKey: string
  icon: LucideIcon
  group: NavGroup
  /** Short label for the tablet icon rail. */
  shortKey: string
}

// Single navigation definition for Sidebar, MobileHeader and the command palette.
export const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, group: 'main', shortKey: 'mobnav.dashboard' },
  { href: '/transactions', labelKey: 'nav.transactions', icon: ArrowDownUp, group: 'main', shortKey: 'mobnav.transactions' },
  { href: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays, group: 'main', shortKey: 'mobnav.calendar' },
  { href: '/analytics', labelKey: 'nav.analytics', icon: BarChart3, group: 'main', shortKey: 'mobnav.analytics' },
  { href: '/categories', labelKey: 'nav.groups', icon: FolderTree, group: 'manage', shortKey: 'mobnav.categories' },
  { href: '/accounts', labelKey: 'nav.accounts', icon: Wallet, group: 'manage', shortKey: 'mobnav.accounts' },
  { href: '/ledger', labelKey: 'lm.title', icon: BookUser, group: 'manage', shortKey: 'lm.short' },
  { href: '/approvals', labelKey: 'approvals.title', icon: GitPullRequestArrow, group: 'manage', shortKey: 'approvals.title' },
  { href: '/recurring', labelKey: 'nav.recurring', icon: RefreshCw, group: 'manage', shortKey: 'mobnav.recurring' },
  { href: '/monthly-report', labelKey: 'nav.report', icon: FileText, group: 'manage', shortKey: 'mobnav.report' },
  { href: '/scan', labelKey: 'nav.scan', icon: ScanLine, group: 'tools', shortKey: 'mobnav.scan' },
  { href: '/import', labelKey: 'nav.import', icon: Upload, group: 'tools', shortKey: 'mobnav.import' },
  { href: '/settings/ledger', labelKey: 'ledger_settings.title', icon: Settings, group: 'system', shortKey: 'mobnav.settings' },
]

export const NAV_GROUP_LABEL_KEY: Record<NavGroup, string | null> = {
  main: null,
  manage: 'common.manage',
  tools: 'common.tools',
  system: 'common.system',
}

/** Proposals waiting for the signed-in user's approval (badge on "Approvals"). */
export const BADGE_HREF = '/approvals'

export function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href))
}
