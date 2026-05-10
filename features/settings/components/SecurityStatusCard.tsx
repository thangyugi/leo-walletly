'use client'

import { ShieldCheck, ShieldAlert, Key, Mail, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsCard } from './SettingsSection'
import { useTranslation } from '@/hooks/useTranslation'

interface SecurityStatusCardProps {
  mfaEnabled: boolean
  passkeyEnabled: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

export function SecurityStatusCard({ mfaEnabled, passkeyEnabled, riskLevel }: SecurityStatusCardProps) {
  const { t, lang } = useTranslation()
  
  const statusItems = [
    { 
      label: t.settings.security.mfaLabel, 
      status: mfaEnabled ? t.common.enabled : t.common.disabled, 
      statusType: mfaEnabled ? 'success' : 'warning',
      icon: ShieldCheck 
    },
    { 
      label: t.settings.security.passkeysLabel, 
      status: passkeyEnabled ? t.common.enabled : t.common.disabled, 
      statusType: passkeyEnabled ? 'success' : 'neutral',
      icon: Key 
    },
    { 
      label: t.settings.security.recoveryLabel, 
      status: t.settings.security.configured, 
      statusType: 'success',
      icon: Mail 
    },
  ]

  const riskLabel = {
    low:    lang === 'vi' ? 'THẤP' : (lang === 'ja' ? '低' : 'LOW'),
    medium: lang === 'vi' ? 'TRUNG BÌNH' : (lang === 'ja' ? '中' : 'MEDIUM'),
    high:   lang === 'vi' ? 'CAO' : (lang === 'ja' ? '高' : 'HIGH'),
  }[riskLevel]

  return (
    <SettingsCard>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {riskLevel === 'low' ? (
            <ShieldCheck className="w-5 h-5 text-[var(--color-text-gain)]" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-[var(--color-text-warning)]" />
          )}
          <span className="font-bold text-sm">
            {t.settings.security.securityStatus}: {riskLabel}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 w-8 rounded-full",
                i === 1 ? "bg-[var(--color-text-gain)]" : "bg-[var(--color-border-default)]"
              )} 
            />
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statusItems.map((item) => (
          <div key={item.label} className="p-4 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] space-y-3">
            <item.icon className="w-5 h-5 text-[var(--color-text-secondary)]" />
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">{item.label}</p>
              <div className="flex items-center justify-between mt-1">
                <span className={cn(
                  "text-xs font-semibold",
                  item.statusType === 'success' ? "text-[var(--color-text-gain)]" : 
                  item.statusType === 'warning' ? "text-[var(--color-text-warning)]" : "text-[var(--color-text-tertiary)]"
                )}>
                  {item.status}
                </span>
                <ChevronRight className="w-3 h-3 text-[var(--color-text-quaternary)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  )
}
