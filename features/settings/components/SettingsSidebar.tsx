'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  User, 
  Settings, 
  ShieldCheck, 
  Building2, 
  Bell, 
  Palette, 
  Globe, 
  Link2, 
  Monitor, 
  Lock, 
  History 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

export function SettingsSidebar() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const personalItems = [
    { href: '/settings/profile',       label: t.settings.sidebar.profile,       icon: User },
    { href: '/settings/account',       label: t.settings.sidebar.account,       icon: Settings },
    { href: '/settings/security',      label: t.settings.sidebar.security,      icon: ShieldCheck },
    { href: '/settings/notifications', label: t.settings.sidebar.notifications, icon: Bell },
    { href: '/settings/appearance',    label: t.settings.sidebar.appearance,    icon: Palette },
    { href: '/settings/localization',  label: t.settings.sidebar.localization,  icon: Globe },
  ]

  const workspaceItems = [
    { href: '/settings/ledger',        label: t.ledger_settings.title,                icon: Building2 },
    { href: '/settings/audit-log',     label: t.settings.sidebar.auditLog,      icon: History },
  ]

  const dataItems = [
    { href: '/settings/connected-apps',label: t.settings.sidebar.connectedApps, icon: Link2 },
    { href: '/settings/devices',       label: t.settings.sidebar.devices,       icon: Monitor },
    { href: '/settings/privacy',       label: t.settings.sidebar.privacy,       icon: Lock },
  ]

  const renderItem = (item: any) => {
    const isActive = pathname === item.href
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group",
          isActive 
            ? "bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)] font-medium"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-text-primary)]"
        )}
      >
        <Icon 
          className={cn(
            "w-4 h-4 transition-colors",
            isActive 
              ? "text-[var(--color-sidebar-item-active-text)]" 
              : "text-[var(--color-text-quaternary)] group-hover:text-[var(--color-text-secondary)]"
          )} 
        />
        {item.label}
      </Link>
    )
  }

  return (
    <nav className="w-64 shrink-0 flex flex-col gap-6 pr-4 border-r border-[var(--color-border-subtle)] h-full overflow-y-auto scrollbar-hide">
      <div>
        <h2 className="px-3 mb-2 text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest">
          {t.settings.common.personal}
        </h2>
        <div className="flex flex-col gap-0.5">
          {personalItems.map(renderItem)}
        </div>
      </div>

      <div>
        <h2 className="px-3 mb-2 text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest">
          {t.settings.common.workspace}
        </h2>
        <div className="flex flex-col gap-0.5">
          {workspaceItems.map(renderItem)}
        </div>
      </div>

      <div>
        <h2 className="px-3 mb-2 text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest">
          {t.settings.common.dataSecurity}
        </h2>
        <div className="flex flex-col gap-0.5">
          {dataItems.map(renderItem)}
        </div>
      </div>
    </nav>
  )
}
