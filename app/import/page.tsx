'use client'

import { useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore } from '@/stores/transactions'
import { parseFile } from '@/features/import/parsers'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { formatDate, cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import type { ImportResult, PaymentProvider } from '@/types'

const PROVIDER_OPTIONS: { value: PaymentProvider; label: string; desc: string; color: string }[] = [
  { value: 'rakuten-pay',  label: 'Rakuten Pay',   desc: '楽天カード明細 CSV / PDF', color: '#BF0000' },
  { value: 'paypay',       label: 'PayPay',         desc: 'PayPay取引履歴 CSV / PDF', color: '#FF0033' },
  { value: 'paypay-card',  label: 'PayPayカード',   desc: 'PayPayクレジット明細 CSV', color: '#8B1AFF' },
]

export default function ImportPage() {
  const { addTransactions } = useTransactionsStore()
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const [provider,    setProvider]    = useState<PaymentProvider>('rakuten-pay')
  const [result,      setResult]      = useState<ImportResult | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [confirmed,   setConfirmed]   = useState(false)
  const [dragging,    setDragging]    = useState(false)

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    setResult(null)
    setConfirmed(false)
    try {
      const res = await parseFile(file, provider)
      setResult(res)
      if (!res.success || res.transactions.length === 0) {
        setError(res.errors.join(' / ') || t.import.noTxnFound)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleConfirm() {
    if (!result?.transactions.length) return
    addTransactions(result.transactions)
    setConfirmed(true)
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.import.title} subtitle={t.import.subtitle} />

      <Card padding="none">
        <CardHeader><CardTitle>{t.import.selectSource}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDER_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setProvider(p.value)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                  provider === p.value
                    ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-25)]'
                    : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] bg-[var(--color-surface-default)]'
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: p.color }} />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{p.label}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl border-2 border-dashed p-12 flex flex-col items-center justify-center text-center transition-all',
          dragging
            ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-25)]'
            : 'border-[var(--color-border-default)] bg-[var(--color-surface-default)]'
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-sunken)] flex items-center justify-center mb-4">
          {loading
            ? <span className="animate-spin-slow w-5 h-5 border-2 border-[var(--color-interactive-primary)] border-t-transparent rounded-full" />
            : <Upload className="w-6 h-6 text-[var(--color-text-tertiary)]" />
          }
        </div>
        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
          {loading ? t.import.parsing : t.import.dropHint}
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t.import.supports}</p>
        <label>
          <input type="file" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} className="sr-only" />
          <Button variant="secondary" size="sm" disabled={loading} className="cursor-pointer">
            <span>{t.import.browse}</span>
          </Button>
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border-error)] bg-[var(--color-status-loss-bg)] text-sm text-[var(--color-text-loss)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {confirmed && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-gain-200)] bg-[var(--color-status-gain-bg)] text-sm text-[var(--color-text-gain)]">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t.import.success.replace('{{count}}', String(result?.transactions.length || 0))}</span>
        </div>
      )}

      {result && result.transactions.length > 0 && !confirmed && (
        <Card padding="none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--color-text-gain)]" />
              {t.import.found.replace('{{count}}', String(result.transactions.length))}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowPreview((v) => !v)}
                iconRight={showPreview ? <ChevronUp /> : <ChevronDown />}>
                {t.import.preview}
              </Button>
              <Button size="sm" onClick={handleConfirm}>
                {t.import.confirm}
              </Button>
            </div>
          </CardHeader>

          {showPreview && (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm table-financial">
                <thead className="sticky top-0 bg-[var(--color-surface-default)]">
                  <tr>
                    <th className="text-left">{t.common.date}</th>
                    <th className="text-left">{t.common.details}</th>
                    <th className="text-right">{t.common.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.transactions.slice(0, 50).map((tx, i) => (
                    <tr key={tx.id ?? i}>
                      <td className="text-[var(--color-text-tertiary)] whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="max-w-[200px] truncate">{tx.description}</td>
                      <td className={cn('cell-amount', tx.amount >= 0 ? 'gain' : 'loss')}>
                        {format(tx.amount, { sign: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
