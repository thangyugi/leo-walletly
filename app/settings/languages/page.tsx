'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PageTitle } from '@/features/settings/components/Field'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import type { Views } from '@/types/supabase'

export default function LanguagesPage() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<Views<'v_translation_coverage'>[] | null>(null)

  useEffect(() => { void supabase.from('v_translation_coverage').select('*').then(({ data }) => setRows(data ?? [])) }, [])

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageTitle title={t.languagesAdmin.title} subtitle={t.languagesAdmin.subtitle} />
      {!rows ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
        <div className="card-base divide-y divide-[var(--color-border-subtle)]">
          {rows.map((r) => (
            <div key={r.language_code} className="px-5 py-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{r.native_name}</span>
                <span className="text-xs font-mono text-[var(--color-text-quaternary)]">{r.language_code}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.is_active ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]'}`}>{r.is_active ? t.languagesAdmin.active : t.languagesAdmin.inactive}</span>
                <span className="ml-auto text-sm font-tabular font-semibold">{Number(r.pct ?? 0).toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-bg-sunken)] overflow-hidden" role="progressbar" aria-valuenow={Number(r.pct ?? 0)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-[var(--color-interactive-primary)]" style={{ width: `${r.pct ?? 0}%` }} />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1.5">
                {t.languagesAdmin.coverage}: {r.translated} / {r.total_keys}{r.machine ? ` · ${t.languagesAdmin.machine}: ${r.machine}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-[var(--color-text-tertiary)] mt-4">{t.languagesAdmin.howToAdd}</p>
    </div>
  )
}
