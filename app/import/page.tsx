'use client'

import { useState, useRef } from 'react'
import {
  Upload, CheckCircle2, AlertCircle, X,
  Sparkles, RefreshCw, Globe, RotateCcw, ArrowRight, Check,
  TrendingDown, TrendingUp, Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore } from '@/stores/transactions'
import { parseFile, detectColumnsFromCSV, autoDetectProvider } from '@/features/import/parsers'
import type { ImportResult, ColumnMapping } from '@/features/import/parsers'
import { cn } from '@/lib/utils'
import { PROVIDERS, CATEGORIES, type ProviderRegion } from '@/lib/constants'
import type { PaymentProvider, Transaction, Category } from '@/types'
import { formatMoney } from '@/lib/money'
import { useTranslation } from '@/hooks/useTranslation'
import { useCategoryStore, resolveCategoryId } from '@/features/categories/store'

const IMPORT_PROVIDERS = PROVIDERS.filter((p) => p.fileTypes.length > 0)

type Region = ProviderRegion
type PageStep = 'setup' | 'review'

function fmtDate(d: string): string {
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

function getCat(v: string, categories: Category[]) {
  return categories.find((c) => c.id === v)
}

// ---- Step indicator ---------------------------------------------------------
function StepBar({
  step, file, provider, t,
}: {
  step: PageStep
  file: File | null
  provider: PaymentProvider
  t: any
}) {
  const provMeta = PROVIDERS.find((p) => p.value === provider)
  const steps = [
    { key: 'setup', label: t.import.stepSetup },
    { key: 'review', label: t.import.stepReview },
  ]
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map(({ key, label }, i) => {
        const done    = step === 'review' && key === 'setup'
        const current = step === key
        return (
          <div key={key} className="flex items-center gap-1">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
              done    ? 'bg-brand-100 text-brand-700' :
              current ? 'bg-brand-600 text-white shadow-sm' :
                        'bg-surface-alt text-text-muted'
            )}>
              <span className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                done    ? 'bg-brand-600 text-white' :
                current ? 'bg-white text-brand-600' :
                          'bg-border text-text-muted'
              )}>
                {done ? '✓' : i + 1}
              </span>
              {done && key === 'setup' && provMeta ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: provMeta.color }} />
                  {provMeta.label}
                  {file && <span className="opacity-60">· {file.name.slice(0, 16)}{file.name.length > 16 ? '…' : ''}</span>}
                </span>
              ) : (
                <span className="hidden sm:inline">{label}</span>
              )}
            </div>
            {i < 1 && <ArrowRight className="w-3 h-3 text-border shrink-0" />}
          </div>
        )
      })}
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
        'flex items-start gap-3 p-3 rounded-xl border text-left transition-all w-full',
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
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary truncate">{p.label}</p>
        <p className="text-xs text-text-muted mt-0.5 leading-snug">{desc}</p>
        <div className="flex gap-1 mt-1.5 flex-wrap">
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

// ---- Column mapping ---------------------------------------------------------
function ColSelect({ label, value, headers, onChange }: {
  label: string; value: string | null; headers: string[]; onChange: (v: string) => void
}) {
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

// ---- Preview row ------------------------------------------------------------
function PreviewRow({ tx, checked, onToggle, t }: { tx: Transaction; checked: boolean; onToggle: () => void; t: any }) {
  const isIncome = tx.transactionType === 'income'
  const { categories } = useCategoryStore()
  
  const cat      = categories.find((c) => c.id === resolveCategoryId(tx.categoryId as string, categories))
  const catLabel = cat ? cat.name : (tx.categoryId || 'Other')

  return (
    <tr className={cn('border-t border-border transition-colors', !checked && 'opacity-40')}>
      <td className="py-2.5 pl-3 pr-1 w-8">
        <button
          onClick={onToggle}
          className={cn(
            'w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all shrink-0',
            checked ? 'bg-brand-600 border-brand-600' : 'bg-white border-border hover:border-brand-400',
          )}
          style={{ width: '18px', height: '18px', minWidth: '18px' }}
        >
          {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </button>
      </td>
      <td className="py-2.5 px-2 text-xs text-text-muted whitespace-nowrap">
        {fmtDate(tx.transactionDate)}
      </td>
      <td className="py-2.5 px-2">
        <span className={cn(
          'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
          isIncome ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600',
        )}>
          {isIncome
            ? <TrendingUp className="w-2.5 h-2.5" />
            : <TrendingDown className="w-2.5 h-2.5" />}
          {isIncome
            ? t.transactions.typeIncome
            : t.transactions.typeExpense}
        </span>
      </td>
      <td className="py-2.5 px-2 max-w-[180px]">
        <p className="text-sm text-text-primary truncate">{tx.description}</p>
      </td>
      <td className="py-2.5 px-2 hidden sm:table-cell">
        <span className="inline-flex items-center gap-1 text-xs text-text-secondary whitespace-nowrap">
          <span>{cat?.emoji}</span>
          <span>{catLabel}</span>
        </span>
      </td>
      <td className="py-2.5 px-3 text-right whitespace-nowrap">
        <span className={cn('text-sm font-semibold tabular-nums', isIncome ? 'text-brand-600' : 'text-red-500')}>
          {isIncome ? '+' : '−'}{formatMoney(Math.abs(tx.amount))}
        </span>
      </td>
    </tr>
  )
}

// =============================================================================
export default function ImportPage() {
  const { addTransactions } = useTransactionsStore()
  const { t, lang }         = useTranslation()
  const { categories }      = useCategoryStore()
  const fileInputRef        = useRef<HTMLInputElement>(null)

  const L = (ja: string, vi: string, en: string) =>
    lang === 'ja' ? ja : lang === 'vi' ? vi : en

  const [region,      setRegion]      = useState<Region>('jp')
  const [provider,    setProvider]    = useState<PaymentProvider>('generic_csv')
  const [dragging,    setDragging]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [file,        setFile]        = useState<File | null>(null)
  const [result,      setResult]      = useState<ImportResult | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [detected,    setDetected]    = useState<PaymentProvider | null>(null)
  const [mapping,     setMapping]     = useState<ColumnMapping | null>(null)
  const [userMapping, setUserMapping] = useState<Partial<ColumnMapping>>({})
  const [confirmed,   setConfirmed]   = useState(false)
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [showErrors,  setShowErrors]  = useState(false)

  const step: PageStep = result && !confirmed ? 'review' : 'setup'

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
    setSelected(new Set())
    setFile(f)

    try {
      const isPdf = f.name.toLowerCase().endsWith('.pdf')
      let activeProvider = provider

      if (!isPdf) {
        const buf     = await f.slice(0, 4096).arrayBuffer()
        const bytes   = new Uint8Array(buf)
        const hasBom  = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
        const sjis    = new TextDecoder('shift-jis').decode(buf)
        const cleaned = (hasBom || sjis.includes('') ? new TextDecoder('utf-8').decode(buf) : sjis).replace(/^﻿/, '')

        const headers  = cleaned.split('\n')[0].split(',').map((h) => h.trim().replace(/^﻿/, ''))
        const guessed  = autoDetectProvider(headers)
        if (guessed && guessed !== provider) {
          activeProvider = guessed
        }

        if (activeProvider === 'generic_csv') {
          const det = detectColumnsFromCSV(cleaned)
          setMapping(det)
        }
      }

      const res = await parseFile(f, activeProvider, userMapping)
      setResult(res)
      setProvider(res.provider)
      setSelected(new Set(res.transactions.map((tx) => tx.id)))

      if (!res.success && res.transactions.length === 0) {
        setError(res.errors.join('\n') || t.import.errorNoTxns)
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
      const res = await parseFile(file, 'generic_csv', userMapping)
      setResult(res)
      setSelected(new Set(res.transactions.map((tx) => tx.id)))
      if (!res.success && res.transactions.length === 0) setError(res.errors.join('\n'))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!result?.transactions.length) return
    const toAdd = result.transactions.filter((tx) => selected.has(tx.id)).map(tx => ({
      ...tx,
      categoryId: resolveCategoryId(tx.categoryId as string, categories) || categories[0]?.id
    }))
    if (!toAdd.length) return
    addTransactions(toAdd as Transaction[])
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
    setSelected(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleRow(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleAll() {
    if (!result) return
    if (selected.size === result.transactions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(result.transactions.map((tx) => tx.id)))
    }
  }

  const selectedCount = selected.size
  const providerMeta  = PROVIDERS.find((p) => p.value === provider)

  const regionTabs: { key: Region; label: string; flag: string }[] = [
    { key: 'jp',     label: t.import.regionJapan,     flag: '🇯🇵' },
    { key: 'vn',     label: t.import.regionVietnam,   flag: '🇻🇳' },
    { key: 'global', label: t.import.regionUniversal, flag: '🌐' },
  ]

  return (
    <div className="animate-fade-in space-y-5">
      <div className="space-y-3">
        <PageHeader title={t.import.title} subtitle={t.import.subtitle} />
        <StepBar step={step} file={file} provider={provider} t={t} />
      </div>

      {step === 'setup' && (
        <>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
            onClick={() => !loading && fileInputRef.current?.click()}
            className={cn(
              'rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none',
              dragging  ? 'border-brand-500 bg-brand-50' :
              loading   ? 'border-border bg-surface-alt cursor-wait' :
                          'border-border bg-white hover:border-brand-300 hover:bg-brand-50/30'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />
            <div className="w-14 h-14 rounded-2xl bg-surface-alt flex items-center justify-center mb-4">
              {loading
                ? <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                : <Upload className="w-7 h-7 text-text-muted" />}
            </div>
            <p className="text-sm font-semibold text-text-primary">{t.import.dropFile}</p>
            <p className="text-xs text-text-muted mt-1">{t.import.supportedFormats}</p>
            <div className="mt-4 px-5 py-2 rounded-lg bg-surface-alt text-xs font-medium text-text-muted">
              {loading
                ? t.import.parsing
                : t.import.clickToBrowse}
            </div>
            <p className="mt-3 text-[11px] text-text-muted flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {t.import.autoDetectHint}
            </p>
          </div>
        </>
      )}

      {mapping && provider === 'generic_csv' && step === 'setup' && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-500 shrink-0" />
            <p className="text-sm font-semibold text-text-primary">{t.import.colMapping}</p>
            <p className="text-xs text-text-muted ml-auto">{t.import.colMappingHint}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ColSelect label={t.import.colDate} value={userMapping.dateCol ?? mapping.dateCol} headers={mapping.headers}
              onChange={(v) => setUserMapping((m) => ({ ...m, dateCol: v }))} />
            <ColSelect label={t.import.colDesc} value={userMapping.descCol ?? mapping.descCol} headers={mapping.headers}
              onChange={(v) => setUserMapping((m) => ({ ...m, descCol: v }))} />
            {mapping.amountCol !== null ? (
              <ColSelect label={t.import.colAmount} value={userMapping.amountCol ?? mapping.amountCol} headers={mapping.headers}
                onChange={(v) => setUserMapping((m) => ({ ...m, amountCol: v, debitCol: null, creditCol: null }))} />
            ) : (
              <>
                <ColSelect label={t.import.colDebit} value={userMapping.debitCol ?? mapping.debitCol} headers={mapping.headers}
                  onChange={(v) => setUserMapping((m) => ({ ...m, debitCol: v, amountCol: null }))} />
                <ColSelect label={t.import.colCredit} value={userMapping.creditCol ?? mapping.creditCol} headers={mapping.headers}
                  onChange={(v) => setUserMapping((m) => ({ ...m, creditCol: v, amountCol: null }))} />
              </>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={reParseWithMapping} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5" />
            {t.import.reParse}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            {error.split('\n').map((e, i) => <p key={i}>{e}</p>)}
          </div>
          <button onClick={() => setError(null)} className="shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {result && result.transactions.length > 0 && !confirmed && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          {(() => {
            const txns    = result.transactions
            const income  = txns.filter((t) => t.transactionType === 'income').reduce((s, t) => s + t.amount, 0)
            const expense = txns.filter((t) => t.transactionType === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
            const net     = income - expense
            return (
              <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">
                    {t.transactions.txnTotal}
                  </p>
                  <p className="text-lg font-bold text-text-primary">{txns.length}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">
                    {L('収入', 'Thu vào', 'Income')}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-brand-600">+{formatMoney(income)}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">
                    {L('支出', 'Chi ra', 'Expense')}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-red-500">−{formatMoney(expense)}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">
                    {L('収支', 'Cân đối', 'Net')}
                  </p>
                  <p className={cn('text-sm font-bold tabular-nums', net >= 0 ? 'text-brand-600' : 'text-red-500')}>
                    {net >= 0 ? '+' : '−'}{formatMoney(Math.abs(net))}
                  </p>
                </div>
              </div>
            )
          })()}

          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-alt">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className={cn(
                  'rounded border-2 flex items-center justify-center transition-all',
                  selectedCount === result.transactions.length
                    ? 'bg-brand-600 border-brand-600'
                    : selectedCount > 0
                    ? 'bg-brand-200 border-brand-400'
                    : 'bg-white border-border hover:border-brand-400',
                )}
                style={{ width: '18px', height: '18px', minWidth: '18px' }}
              >
                {selectedCount === result.transactions.length
                  ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  : selectedCount > 0
                  ? <Minus className="w-2.5 h-2.5 text-brand-600" strokeWidth={3} />
                  : null}
              </button>
              <span className="text-xs font-semibold text-text-primary">
                {selectedCount} / {result.transactions.length}
                {' '}{t.transactions.selected}
              </span>
              {result.errors.length > 0 && (
                <button
                  onClick={() => setShowErrors((v) => !v)}
                  className="text-xs text-amber-600 font-medium hover:underline"
                >
                  {result.errors.length} {t.import.warnings}
                </button>
              )}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t.import.resetBtn}
            </button>
          </div>

          {showErrors && result.errors.length > 0 && (
            <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-50 space-y-1 max-h-28 overflow-y-auto">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-amber-700">{e}</p>
              ))}
            </div>
          )}

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface-alt border-b border-border z-10">
                <tr>
                  <th className="py-2 pl-3 pr-1 w-8" />
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted whitespace-nowrap">
                    {t.transactions.date}
                  </th>
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    {t.transactions.labelType}
                  </th>
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    {t.transactions.content}
                  </th>
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted hidden sm:table-cell">
                    {t.transactions.labelCategory}
                  </th>
                  <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    {t.transactions.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.transactions.map((tx, i) => (
                  <PreviewRow
                    key={tx.id || i}
                    tx={tx}
                    checked={selected.has(tx.id)}
                    onToggle={() => toggleRow(tx.id)}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border bg-surface-alt/50 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 text-sm text-text-secondary">
              {selectedCount > 0 ? (
                <>
                  {t.import.importItems.replace('{{count}}', String(selectedCount))}
                </>
              ) : (
                <span className="text-text-muted">
                  {t.import.selectAtLeastOne}
                </span>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={handleReset} className="flex-1 sm:flex-none">
                {t.import.resetBtn}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedCount === 0}
                size="lg"
                className="flex-1 sm:flex-none sm:min-w-[180px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t.import.importBtn.replace('{{count}}', String(selectedCount))}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmed && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-700">
                {t.import.importSuccess.replace('{{count}}', String(selectedCount))}
              </p>
              <p className="text-xs text-brand-600 mt-0.5">
                {t.import.checkDashboard}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />
            {t.import.importAnother}
          </Button>
        </div>
      )}
    </div>
  )
}
