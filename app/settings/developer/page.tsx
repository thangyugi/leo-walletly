'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Copy, Plus, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageTitle, selectClass } from '@/features/settings/components/Field'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

type TokenRow = { id: string; name: string; token_prefix: string; access_level: string; last_used_at: string | null; expires_at: string | null; revoked_at: string | null; created_at: string }

export default function DeveloperPage() {
  const { t } = useTranslation()
  const ledger = useLedgerStore((s) => s.current)
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [name, setName] = useState('')
  const [level, setLevel] = useState<'read' | 'write'>('read')
  const [created, setCreated] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!ledger) return
    const { data } = await supabase.from('api_tokens').select('id, name, token_prefix, access_level, last_used_at, expires_at, revoked_at, created_at')
      .eq('ledger_id', ledger.id).is('revoked_at', null).order('created_at', { ascending: false })
    setTokens(data ?? [])
  }, [ledger])
  useEffect(() => { void load() }, [load])

  async function create() {
    if (!ledger || !name.trim()) return
    const { data, error } = await supabase.rpc('create_api_token', { p_ledger_id: ledger.id, p_name: name.trim(), p_access_level: level })
    if (error) return toast.error(error.message)
    setCreated(data); setName(''); await load()
  }

  async function revoke(id: string) {
    const { error } = await supabase.from('api_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    if (error) return toast.error(error.message)
    await load()
  }

  return (
    <div className="animate-fade-in max-w-3xl space-y-8">
      <PageTitle title={t.dev.title} subtitle={t.dev.subtitle} />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><KeyRound className="w-4 h-4" />{t.dev.tokens}</h3>
        <p className="text-xs text-[var(--color-text-tertiary)]">{t.dev.tokensSub}</p>
        <div className="card-base p-4 flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[180px]"><Input label={t.dev.tokenName} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <select aria-label={t.dev.scopes} className={`${selectClass} w-28`} value={level} onChange={(e) => setLevel(e.target.value as 'read' | 'write')}>
            <option value="read">read</option><option value="write">write</option>
          </select>
          <Button icon={<Plus />} disabled={!name.trim()} onClick={create}>{t.dev.create}</Button>
        </div>
        {created && (
          <div className="rounded-xl bg-[var(--color-status-warning-bg)] p-4 space-y-2">
            <p className="text-xs text-[var(--color-text-warning)]">{t.dev.copyNow}</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-xs font-mono break-all bg-[var(--color-surface-default)] p-2 rounded">{created}</code>
              <Button size="sm" variant="outline" icon={<Copy />} onClick={() => { void navigator.clipboard.writeText(created); toast.success(t.ledger_settings.copied) }}>{t.members.copyLink}</Button>
            </div>
          </div>
        )}
        {tokens.length > 0 && (
          <div className="card-base divide-y divide-[var(--color-border-subtle)]">
            {tokens.map((tk) => (
              <div key={tk.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-[var(--color-text-primary)]">{tk.name}</span>
                  <span className="ml-2 font-mono text-xs text-[var(--color-text-quaternary)]">{tk.token_prefix}…</span>
                </span>
                <span className="text-xs">{tk.access_level}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{t.dev.lastUsed}: {tk.last_used_at ? formatDate(tk.last_used_at) : '—'}</span>
                <Button size="sm" variant="ghost" onClick={() => revoke(tk.id)}>{t.dev.revoke}</Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-base p-5 flex gap-3 items-start opacity-80">
        <Landmark className="w-5 h-5 text-[var(--color-text-tertiary)] mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.dev.bank} <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)]">{t.placeholders.devTitle}</span></p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t.dev.bankSub}</p>
        </div>
      </section>
    </div>
  )
}
