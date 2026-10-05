'use client'

import {
  AlertTriangle, AlertOctagon, CheckCircle2, FileText, Zap, RefreshCw, Clock, UserPlus, Users, ShieldAlert, Bell,
  Pencil, Trash2, GitPullRequestArrow, XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useMasterStore } from '@/features/master/store'
import type { AppNotification } from './store'

const ICONS: Record<string, LucideIcon> = {
  AlertTriangle, AlertOctagon, CheckCircle2, FileText, Zap, RefreshCw, Clock, UserPlus, Users, ShieldAlert, Bell,
  Pencil, Trash2, GitPullRequestArrow, XCircle,
}

const SEVERITY: Record<string, { bg: string; fg: string }> = {
  info: { bg: 'bg-[var(--color-status-info-bg)]', fg: 'text-[var(--color-text-info)]' },
  success: { bg: 'bg-[var(--color-status-gain-bg)]', fg: 'text-[var(--color-text-gain)]' },
  warning: { bg: 'bg-[var(--color-status-warning-bg)]', fg: 'text-[var(--color-text-warning)]' },
  danger: { bg: 'bg-[var(--color-status-loss-bg)]', fg: 'text-[var(--color-text-loss)]' },
}

export function timeAgo(iso: string, lang: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  if (diff < 3600) return rtf.format(-Math.max(1, Math.round(diff / 60)), 'minute')
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour')
  return rtf.format(-Math.round(diff / 86400), 'day')
}

/** Title/body come from notification_types keys + notification_params. */
export function useNotificationText() {
  const { tk } = useTranslation()
  const types = useMasterStore((s) => s.notificationTypes)
  return (n: AppNotification) => {
    const type = types.find((x) => x.code === n.typeCode)
    return {
      title: tk(type?.title_key ?? `notification.${n.typeCode}.title`, n.params),
      body: tk(type?.body_key ?? `notification.${n.typeCode}.body`, n.params),
      icon: ICONS[type?.icon ?? 'Bell'] ?? Bell,
      tone: SEVERITY[type?.severity ?? 'info'] ?? SEVERITY.info,
      category: type?.category_code ?? null,
    }
  }
}

export function NotificationItem({ n, compact, onClick }: { n: AppNotification; compact?: boolean; onClick?: () => void }) {
  const { lang } = useTranslation()
  const text = useNotificationText()(n)
  const Icon = text.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('w-full flex gap-3 text-left transition-colors hover:bg-[var(--color-bg-sunken)]', compact ? 'px-4 py-3' : 'px-5 py-4')}
    >
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', text.tone.bg)}>
        <Icon className={cn('w-4 h-4', text.tone.fg)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-[var(--color-text-primary)] line-clamp-1', compact ? 'text-xs' : 'text-sm')}>{text.title}</p>
        <p className={cn('text-[var(--color-text-tertiary)] mt-0.5 line-clamp-2', compact ? 'text-[11px]' : 'text-xs')}>{text.body}</p>
        <p className="text-[10px] text-[var(--color-text-quaternary)] mt-1">{timeAgo(n.createdAt, lang)}</p>
      </div>
      {!n.readAt && <span className="w-2 h-2 mt-1.5 rounded-full bg-[var(--color-interactive-primary)] shrink-0" aria-hidden />}
    </button>
  )
}
