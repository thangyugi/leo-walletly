import { cn } from '@/lib/utils'
import { AlertCircle, WifiOff, RefreshCw, Inbox } from 'lucide-react'
import { Button } from './button'

interface LoadingStateProps { className?: string; message?: string }
interface ErrorStateProps  { className?: string; message?: string; onRetry?: () => void }
interface EmptyStateProps  {
  className?: string
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}
interface OfflineStateProps { className?: string; onRetry?: () => void }

export function LoadingState({ className, message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-text-tertiary)]', className)}>
      <span className="animate-spin-slow w-6 h-6 border-2 border-[var(--color-border-strong)] border-t-[var(--color-interactive-primary)] rounded-full" />
      <span className="text-sm">{message}</span>
    </div>
  )
}

export function ErrorState({ className, message = 'An error occurred.', onRetry }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}>
      <div className="w-10 h-10 rounded-full bg-[var(--color-status-loss-bg)] flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-[var(--color-text-loss)]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Something went wrong</p>
        <p className="text-xs text-[var(--color-text-tertiary)] max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<RefreshCw />}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ className, icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}>
      <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-sunken)] flex items-center justify-center text-[var(--color-text-quaternary)]">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
        {description && (
          <p className="text-xs text-[var(--color-text-tertiary)] max-w-xs leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function OfflineState({ className, onRetry }: OfflineStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}>
      <div className="w-10 h-10 rounded-full bg-[var(--color-status-warning-bg)] flex items-center justify-center">
        <WifiOff className="w-5 h-5 text-[var(--color-text-warning)]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">You&apos;re offline</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">Check your connection and try again.</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<RefreshCw />}>
          Retry
        </Button>
      )}
    </div>
  )
}

export function SyncIndicator({ syncing, className }: { syncing: boolean; className?: string }) {
  if (!syncing) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]', className)}>
      <span className="animate-spin-slow w-3 h-3 border border-current border-t-transparent rounded-full" />
      Syncing…
    </span>
  )
}
