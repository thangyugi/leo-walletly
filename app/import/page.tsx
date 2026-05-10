'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload, FileText, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp,
  Sparkles, RefreshCw, Globe, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore } from '@/stores/transactions'
import { parseFile, detectColumnsFromCSV, autoDetectProvider } from '@/features/import/parsers'
import type { ImportResult, ColumnMapping } from '@/features/import/parsers'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { PROVIDERS, type ProviderRegion } from '@/lib/constants'
import type { PaymentProvider, Transaction } from '@/types'
import { useTranslation } from '@/hooks/useTranslation'

// Importable providers only (manual/ai-scan have no file upload)
const IMPORT_PROVIDERS = PROVIDERS.filter((p) => p.fileTypes.length > 0)

type Region = ProviderRegion

// ---- helpers ----------------------------------------------------------------
function getInitials(text: string): string {
  const words = text.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return text.slice(0, 2).toUpperCase()
}

function fmtDate(d: string): string {
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

// ---- Column mapping selector ------------------------------------------------
function ColSelect({
  label, value, headers, onChange,
}: { label: string; value: string | null; headers: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-text-muted">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-2 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">—</option>
        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  )
}

// ---- Provider card ----------------------------------------------------------
function ProviderCard({
  p, selected, onClick, lang,
}: {
  p: typeof PROVIDERS[0]
  selected: boolean
  onClick: () => void
  lang: string
}) {
  const desc = lang === 'ja' ? p.descJa : lang === 'vi' ? p.descVi : p.descEn
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
        selected
          ? 'border-brand-500 bg-brand-50 shadow-sm'
          : 'border-border bg-white hover:border-brand-300 hover:shadow-sm'
      )}
      style={selected ? { borderColor: p.color, backgroundColor: `${p.color}10` } : {}}
    >
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: p.color }}
      >
        {p.initials}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{p.label}</p>
        <p className="text-xs text-text-muted mt-0.5 leading-snug">{desc}</p>
        <div className="flex gap-1 mt-1.5">
          {p.fileTypes.map((ft) => (
            <span key={ft} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-alt text-text-muted uppercase">
              {ft}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}

// ---- Preview row ------------------------------------------------------------
function PreviewRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.amount >= 0
  return (
    <tr className="border-t border-border">
      <td className="py-2 px-3 text-xs text-text-muted whitespace-nowrap">{fmtDate(tx.date)}</td>
      <td className="py-2 px-3 text-sm text-text-primary max-w-[200px] truncate">{tx.description}</td>
      <td className="py-2 px-3 text-right">
        <span className={cn('text-sm font-semibold tabular-nums', isIncome ? 'text-brand-600' : 'text-red-500')}>
          {isIncome ? '+' : ''}¥{Math.abs(tx.amount).toLocaleString()}
        </span>
      </td>
    </tr>
  )
}

// =============================================================================
export default function ImportPage() {
  const { addTransactions } = useTransactionsStore()
  const { t, lang } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const L = (ja: string, vi: string, en: string) =>
    lang === 'ja' ? ja : lang === 'vi' ? vi : en

  // Region tab
  const [region, setRegion] = useState<Region>('jp')
  // Selected provider
  const [provider, setProvider] = useState<PaymentProvider>('rakuten-pay')
  // Upload state
  const [dragging, setDragging]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  // Result
  const [result, setResult]       = useState<ImportResult | null>(null)
  const [error, setError]         = useState<string | null>(null)
  // Preview
  const [showPreview, setShowPreview] = useState(true)
  // Auto-detect
  const [detected, setDetected]   = useState<PaymentProvider | null>(null)
  // Generic CSV column mapping
  const [mapping, setMapping]     = useState<ColumnMapping | null>(null)
  const [userMapping, setUserMapping] = useState<Partial<ColumnMapping>>({})
  // Confirmed
  const [confirmed, setConfirmed] = useState(false)

  const filteredProviders = IMPORT_PROVIDERS.filter((p) =>
    region === 'global' ? true : p.region === region || p.region === 'global'
  )

  async function processFile(f: File) {
    setLoading(true)
    setError(null)
    setResult(null)
    setConfirmed(false)
    setDetected(null)
    setMapping(null)
    setUserMapping({})
    setFile(f)

    try {
      // Auto-detect if generic-csv or peek headers for detection
      const format = f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'csv'
      let activeProvider = provider

      if (format === 'csv') {
        const buffer = await f.slice(0, 4096).arrayBuffer()
        const bytes  = new Uint8Array(buffer)
        const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
        const sjisText = new TextDecoder('shift-jis').decode(buffer)
        const text  = hasBom || sjisText.includes('�')
          ? new TextDecoder('utf-8').decode(buffer)
          : sjisText
        const cleaned = text.replace(/^﻿/, '')

        // peek headers
        const firstLine = cleaned.split('\n')[0]
        const headers = firstLine.split(',').map((h) => h.trim().replace(/^﻿/, ''))

        const guessed = autoDetectProvider(headers)
        if (guessed && guessed !== provider) {
          setDetected(guessed)
          activeProvider = guessed
        }

        // For generic-csv, pre-compute column mapping from header detection
        if (activeProvider === 'generic-csv') {
          const det = detectColumnsFromCSV(cleaned)
          setMapping(det)
        }
      }

      const res = await parseFile(f, activeProvider, userMapping)
      setResult(res)

      if (!res.success && res.transactions.length === 0) {
        setError(res.errors.join(' • ') || L('取引が見つかりませんでした', 'Không tìm thấy giao dịch', 'No transactions found'))
      }

      // Capture mapping returned from generic-csv parser
      if (activeProvider === 'generic-csv' && !mapping) {
        // mapping is already set above; if not, show generic error
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function reParseWithMapping() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await parseFile(file, 'generic-csv', userMapping)
      setResult(res)
      if (!res.success && res.transactions.length === 0) {
        setError(res.errors.join(' • '))
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
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  function handleConfirm() {
    if (!result?.transactions.length) return
    addTransactions(result.transactions)
    setConfirmed(true)
  }

  function handleReset() {
    setFile(null)
    setResult(null)
    setError(null)
    setConfirmed(false)
    setDetected(null)
    setMapping(null)
    setUserMapping({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const regionTabs: { key: Region; label: string; flag: string }[] = [
    { key: 'jp',     label: t.import.regionJapan,     flag: '🇯🇵' },
    { key: 'vn',     label: t.import.regionVietnam,   flag: '🇻🇳' },
    { key: 'global', label: t.import.regionUniversal, flag: '🌐' },
  ]

  const activeProviderMeta = PROVIDERS.find((p) => p.value === provider)

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.import.title} subtitle={t.import.subtitle} />

      {/* Region tabs */}
      <div className="flex gap-1 p-1 bg-surface-alt rounded-xl w-fit">
        {regionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setRegion(tab.key)
              // auto-select first provider in region
              const first = IMPORT_PROVIDERS.find(
                (p) => p.region === tab.key || (tab.key === 'global' && p.region === 'global')
              )
              if (first) setProvider(first.value)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              region === tab.key
                ? 'bg-white shadow-sm text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <span>{tab.flag}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Provider grid */}
      <div>
        <p className="text-xs font-semibold text-text-muted mb-2">{t.import.selectProvider}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredProviders.map((p) => (
            <ProviderCard
              key={p.value}
              p={p}
              selected={provider === p.value}
              onClick={() => setProvider(p.value)}
              lang={lang}
            />
          ))}
        </div>
      </div>

      {/* Auto-detect banner */}
      {detected && detected !== provider && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-brand-200 bg-brand-50 text-sm">
          <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
          <span className="text-brand-700">
            {t.import.autoDetected}
            <strong>{PROVIDERS.find((p) => p.value === detected)?.label ?? detected}</strong>
          </span>
          <button
            className="ml-auto text-xs font-semibold text-brand-600 hover:underline"
            onClick={() => { setProvider(detected); setDetected(null) }}
          >
            {L('適用', 'Áp dụng', 'Apply')}
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={cn(
          'relative rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none',
          dragging
            ? 'border-brand-500 bg-brand-50'
            : loading
            ? 'border-border bg-surface-alt cursor-wait'
            : 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/30'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={activeProviderMeta?.fileTypes.map((t) => `.${t}`).join(',') ?? '.csv,.pdf'}
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
        />
        <div className="w-14 h-14 rounded-2xl bg-surface-alt flex items-center justify-center mb-4">
          {loading
            ? <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            : file
            ? <FileText className="w-7 h-7 text-brand-500" />
            : <Upload className="w-7 h-7 text-text-muted" />
          }
        </div>
        {loading ? (
          <p className="text-sm font-medium text-text-primary">{t.import.parsing}</p>
        ) : file ? (
          <>
            <p className="text-sm font-semibold text-text-primary">{file.name}</p>
            <p className="text-xs text-text-muted mt-1">
              {L('別のファイルをクリックして変更', 'Nhấn để chọn file khác', 'Click to change file')}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-text-primary">{t.import.dropFile}</p>
            <p className="text-xs text-text-muted mt-1">{t.import.supportedFormats}</p>
            <div className="mt-4 px-4 py-2 rounded-lg bg-surface-alt text-xs text-text-muted font-medium">
              {L('クリックしてファイルを選択', 'Nhấn để chọn file', 'Click to browse')}
            </div>
          </>
        )}
        {/* Auto-detect hint */}
        {!file && (
          <p className="mt-3 text-xs text-text-muted flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {t.import.autoDetectHint}
          </p>
        )}
      </div>

      {/* Generic CSV — column mapping UI */}
      {mapping && provider === 'generic-csv' && !confirmed && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-500" />
              {t.import.colMapping}
            </p>
            <p className="text-xs text-text-muted">{t.import.colMappingHint}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ColSelect
              label={t.import.colDate}
              value={userMapping.dateCol ?? mapping.dateCol}
              headers={mapping.headers}
              onChange={(v) => setUserMapping((m) => ({ ...m, dateCol: v }))}
            />
            <ColSelect
              label={t.import.colDesc}
              value={userMapping.descCol ?? mapping.descCol}
              headers={mapping.headers}
              onChange={(v) => setUserMapping((m) => ({ ...m, descCol: v }))}
            />
            {mapping.amountCol !== null ? (
              <ColSelect
                label={t.import.colAmount}
                value={userMapping.amountCol ?? mapping.amountCol}
                headers={mapping.headers}
                onChange={(v) => setUserMapping((m) => ({ ...m, amountCol: v, debitCol: null, creditCol: null }))}
              />
            ) : (
              <>
                <ColSelect
                  label={t.import.colDebit}
                  value={userMapping.debitCol ?? mapping.debitCol}
                  headers={mapping.headers}
                  onChange={(v) => setUserMapping((m) => ({ ...m, debitCol: v, amountCol: null }))}
                />
                <ColSelect
                  label={t.import.colCredit}
                  value={userMapping.creditCol ?? mapping.creditCol}
                  headers={mapping.headers}
                  onChange={(v) => setUserMapping((m) => ({ ...m, creditCol: v, amountCol: null }))}
                />
              </>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={reParseWithMapping} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5" />
            {L('再解析', 'Phân tích lại', 'Re-parse')}
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            {error.split(' • ').map((e, i) => <p key={i}>{e}</p>)}
          </div>
          <button onClick={() => setError(null)} className="shrink-0 mt-0.5 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success */}
      {confirmed && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-brand-200 bg-brand-50 text-sm text-brand-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            {result?.transactions.length} {t.import.addedSuccess}
          </span>
          <button onClick={handleReset} className="ml-auto flex items-center gap-1 text-xs text-brand-600 hover:underline">
            <RotateCcw className="w-3 h-3" />
            {t.import.resetBtn}
          </button>
        </div>
      )}

      {/* Preview & confirm */}
      {result && result.transactions.length > 0 && !confirmed && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-semibold text-text-primary">
                {result.transactions.length} {t.import.txnFound}
              </span>
              {result.errors.length > 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  ({result.errors.length} {L('件のエラー', 'lỗi', 'errors')})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded-lg hover:bg-surface-alt transition-colors"
              >
                {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {t.import.previewTitle}
              </button>
              <Button
                onClick={handleReset}
                variant="secondary"
                size="sm"
              >
                {t.import.resetBtn}
              </Button>
              <Button size="sm" onClick={handleConfirm}>
                {t.import.importBtn}
              </Button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            {(() => {
              const txns = result.transactions
              const income  = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
              const expense = txns.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)
              const net     = income + expense
              return [
                { label: L('収入', 'Thu vào', 'Income'), value: income,  cls: 'text-brand-600' },
                { label: L('支出', 'Chi ra', 'Expense'), value: expense, cls: 'text-red-500' },
                { label: L('収支', 'Cân đối', 'Net'),    value: net,     cls: net >= 0 ? 'text-brand-600' : 'text-red-500' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="px-4 py-3 text-center">
                  <p className="text-xs text-text-muted mb-0.5">{label}</p>
                  <p className={cn('text-sm font-bold tabular-nums', cls)}>
                    {value >= 0 ? '+' : ''}¥{Math.abs(value).toLocaleString()}
                  </p>
                </div>
              ))
            })()}
          </div>

          {/* Preview table */}
          {showPreview && (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-surface-alt">
                  <tr>
                    <th className="text-left text-xs font-semibold text-text-muted py-2 px-3">
                      {L('日付', 'Ngày', 'Date')}
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted py-2 px-3">
                      {L('内容', 'Nội dung', 'Description')}
                    </th>
                    <th className="text-right text-xs font-semibold text-text-muted py-2 px-3">
                      {L('金額', 'Số tiền', 'Amount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.transactions.slice(0, 60).map((tx, i) => (
                    <PreviewRow key={tx.id ?? i} tx={tx} />
                  ))}
                  {result.transactions.length > 60 && (
                    <tr>
                      <td colSpan={3} className="text-center py-3 text-xs text-text-muted">
                        {L(
                          `... 他 ${result.transactions.length - 60} 件`,
                          `... và ${result.transactions.length - 60} giao dịch khác`,
                          `... and ${result.transactions.length - 60} more`
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Parse errors (collapsible) */}
          {result.errors.length > 0 && (
            <details className="border-t border-border">
              <summary className="px-4 py-2 text-xs text-amber-600 font-medium cursor-pointer hover:bg-amber-50">
                {result.errors.length} {L('件の警告', 'cảnh báo', 'warnings')}
              </summary>
              <div className="px-4 pb-3 space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-700">{e}</p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
