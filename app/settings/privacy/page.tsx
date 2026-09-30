'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageTitle } from '@/features/settings/components/Field'
import { SettingsService, type DataRequest } from '@/features/settings/services'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'

export default function PrivacyPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const userId = useLedgerStore((s) => s.userId)
  const [requests, setRequests] = useState<DataRequest[]>([])
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => { if (userId) setRequests(await SettingsService.getDataRequests(userId)) }, [userId])
  useEffect(() => { void load() }, [load])

  async function download(r: DataRequest) {
    if (!r.file_path) return
    const { data, error } = await supabase.storage.from('exports').createSignedUrl(r.file_path, 300)
    if (error) return toast.error(error.message)
    window.open(data.signedUrl, '_blank')
  }

  async function deleteAccount() {
    setDeleting(true)
    try { await SettingsService.deleteMyAccount(); router.replace('/login') } catch (e: any) { toast.error(e.message); setDeleting(false) }
  }

  const status = (s: string) => (t.privacyx as Record<string, string>)[`status_${s}`] ?? s

  return (
    <div className="animate-fade-in max-w-3xl space-y-8">
      <PageTitle title={t.privacyx.title} subtitle={t.privacyx.subtitle} />

      <section className="card-base p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t.privacyx.exportTitle}</h3>
        <p className="text-xs text-[var(--color-text-tertiary)]">{t.privacyx.exportSub}</p>
        <Button size="sm" icon={<Download />} disabled={requests.some((r) => r.request_type === 'export' && ['pending', 'processing'].includes(r.status))}
          onClick={async () => { if (!userId) return; try { await SettingsService.requestExport(userId); toast.success(t.privacyx.requested); await load() } catch (e: any) { toast.error(e.message) } }}>
          {t.privacyx.exportBtn}
        </Button>
        {requests.length > 0 && (
          <div className="pt-3 border-t border-[var(--color-border-subtle)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] mb-2">{t.privacyx.history}</p>
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="text-[var(--color-text-tertiary)] w-40">{new Date(r.requested_at).toLocaleString()}</span>
                <span className="flex-1">{status(r.status)}</span>
                {r.status === 'completed' && r.file_path && <Button size="sm" variant="ghost" onClick={() => download(r)}>{t.privacyx.download}</Button>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-text-loss)]/30 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-loss)]">{t.privacyx.deleteTitle}</h3>
        <p className="text-xs text-[var(--color-text-tertiary)]">{t.privacyx.deleteSub}</p>
        <Input label={t.privacyx.deleteType.replace('{{word}}', t.privacyx.deleteWord)} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <Button variant="destructive" size="sm" icon={<Trash2 />} loading={deleting} disabled={confirmText !== t.privacyx.deleteWord} onClick={deleteAccount}>{t.privacyx.deleteBtn}</Button>
      </section>
    </div>
  )
}
