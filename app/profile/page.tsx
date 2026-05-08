'use client'

import { User, Mail, Globe, Lock, Bell, CreditCard, Camera, ChevronRight, Clock } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

const SECTIONS = [
  {
    icon: Mail,
    label: 'Personal Information',
    description: 'Name, email address, phone number',
  },
  {
    icon: Lock,
    label: 'Security',
    description: 'Password, two-factor authentication, active sessions',
  },
  {
    icon: Bell,
    label: 'Notification Preferences',
    description: 'Budget alerts, weekly summaries, import notifications',
  },
  {
    icon: Globe,
    label: 'Locale & Currency',
    description: 'Language, timezone, default display currency',
  },
  {
    icon: CreditCard,
    label: 'Linked Accounts',
    description: 'Bank connections, CSV import sources, integrations',
  },
]

export default function ProfilePage() {
  const { user } = useAuthStore()
  const userEmail   = user?.email ?? 'user@example.com'
  const userInitial = userEmail[0]?.toUpperCase() ?? 'L'
  const joinDate    = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'January 2026'

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Profile"
        subtitle="Manage your account and preferences"
      />

      {/* Coming-soon banner */}
      <div className="rounded-xl border border-[var(--color-status-warning-bg)] bg-[var(--color-status-warning-bg)] px-4 py-3 flex items-center gap-3">
        <Clock className="w-4 h-4 text-[var(--color-text-warning)] shrink-0" />
        <p className="text-sm text-[var(--color-text-warning)] font-medium">
          Profile management is coming soon. Your data is safe — this section is under active development.
        </p>
      </div>

      {/* Avatar + basic info */}
      <div className="card-base p-6 flex items-start gap-5">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-interactive-primary)] flex items-center justify-center text-white text-2xl font-bold select-none">
            {userInitial}
          </div>
          <button
            disabled
            title="Upload avatar (coming soon)"
            className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--color-surface-default)] border border-[var(--color-border-default)] flex items-center justify-center cursor-not-allowed opacity-50"
          >
            <Camera className="w-3 h-3 text-[var(--color-text-tertiary)]" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-[var(--color-text-primary)]">{userEmail}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
              <User className="w-3 h-3" />
              Personal workspace
            </span>
            <span className="text-[var(--color-border-default)]">·</span>
            <span className="text-xs text-[var(--color-text-tertiary)]">Member since {joinDate}</span>
          </div>
          <button
            disabled
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-link)] cursor-not-allowed opacity-50"
          >
            Edit profile
            <span className="text-[10px] bg-[var(--color-status-warning-bg)] text-[var(--color-text-warning)] px-1.5 py-0.5 rounded font-semibold">Soon</span>
          </button>
        </div>
      </div>

      {/* Disabled settings sections */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] px-1 mb-3">
          Settings sections
        </p>
        {SECTIONS.map(({ icon: Icon, label, description }) => (
          <div
            key={label}
            className={cn(
              'card-base p-4 flex items-center gap-4',
              'opacity-50 cursor-not-allowed select-none'
            )}
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
  )
}
