'use client'

import { Settings, Globe, Palette, Database, Shield, Plug, ChevronRight, Clock } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'

const SECTIONS = [
  {
    group: 'Workspace',
    items: [
      { icon: Globe,    label: 'Locale & Currency',    description: 'Language, timezone, default currency (JPY/USD/VND)' },
      { icon: Palette,  label: 'Appearance',           description: 'Theme, density, color scheme' },
    ],
  },
  {
    group: 'Data',
    items: [
      { icon: Database, label: 'Data Management',      description: 'Export data, clear history, backup & restore' },
      { icon: Plug,     label: 'Integrations',         description: 'Bank connections, CSV providers, API access' },
    ],
  },
  {
    group: 'Account',
    items: [
      { icon: Shield,   label: 'Privacy & Security',   description: 'Data sharing, session management, audit log' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Account Settings"
        subtitle="Workspace preferences and configuration"
      />

      {/* Coming-soon banner */}
      <div className="rounded-xl border border-[var(--color-status-warning-bg)] bg-[var(--color-status-warning-bg)] px-4 py-3 flex items-center gap-3">
        <Clock className="w-4 h-4 text-[var(--color-text-warning)] shrink-0" />
        <p className="text-sm text-[var(--color-text-warning)] font-medium">
          Settings management is coming soon. Language can be changed from the sidebar for now.
        </p>
      </div>

      {SECTIONS.map(({ group, items }) => (
        <div key={group}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] px-1 mb-2">
            {group}
          </p>
          <div className="space-y-2">
            {items.map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                className={cn('card-base p-4 flex items-center gap-4 opacity-50 cursor-not-allowed select-none')}
                aria-disabled
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-sunken)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-semibold bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] text-[var(--color-text-quaternary)] px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
