'use client'

import { categoryTreeOptions } from '@/features/categories/types'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Upload, CheckCircle2, AlertCircle, X, Sparkles, RefreshCw, Globe, RotateCcw,
  ArrowRight, Check, TrendingDown, TrendingUp, Minus, Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { parseFile, detectColumnsFromCSV, autoDetectProvider } from '@/features/import/parsers'
import type { ColumnMapping } from '@/features/import/parsers'
import { resolveCategoryId } from '@/features/categories/store'
import { useAccountsStore } from '@/features/accounts/store'
import { useMasterStore } from '@/features/master/store'
import { useTransactionsStore } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { supabase } from '@/lib/supabase'
import { cn, formatDate, toLocalISODate } from '@/lib/utils'
import type { ImportResult, PaymentProvider, ParsedImportRow } from '@/types'
import type { Tables } from '@/types/supabase'

type PageStep = 'setup' | 'review'
type Row = ParsedImportRow & { selected: boolean; categoryId: string; duplicate: boolean }

function fmtDate(d: string): string {
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

async function sha256(file: File) {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function readHead(file: File) {
  const buf = await file.slice(0, 8192).arrayBuffer()
  const bytes = new Uint8Array(buf)
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
  const utf8 = new TextDecoder('utf-8').decode(buf)
  // Japanese bank CSVs are usually Shift_JIS; fall back when UTF-8 shows replacement chars.
  const text = hasBom || !utf8.includes('�') ? utf8 : new TextDecoder('shift-jis').decode(buf)
  return text.replace(/^﻿/, '')
}

const MAPPING_FIELDS: [keyof ColumnMapping, string][] = [['dateCol', 'date'], ['descCol', 'description'], ['amountCol', 'amount'], ['debitCol', 'debit'], ['creditCol', 'credit']]

// ---- Step indicator ---------------------------------------------------------
function StepBar({ step, file, provider }: { step: PageStep; file: File | null; provider?: Tables<'providers'> }) {
  const { t, tk } = useTranslation()
  const steps: { key: PageStep; label: string }[] = [
    { key: 'setup', label: t.import.stepSetup },
    { key: 'review', label: t.import.stepReview },
  ]
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map(({ key, label }, i) => {
        const done = step === 'review' && key === 'setup'
        const current = step === key
        return (
          <div key={key} className="flex items-center gap-1">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
              done ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)]'
                : current ? 'bg-[var(--color-interactive-primary)] text-white shadow-sm'
                : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]',
            )}>
              <span className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                done ? 'bg-[var(--color-interactive-primary)] text-white'
                  : current ? 'bg-white text-[var(--color-interactive-primary)]'
                  : 'bg-[var(--color-border-default)] text-[var(--color-text-quaternary)]',
              )}>
                {done ? '✓' : i + 1}
              </span>
              {done && provider ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: provider.color }} />
                  {tk(provider.name_key)}
                  {file && <span className="opacity-60">· {file.name.slice(0, 16)}{file.name.length > 16 ? '…' : ''}</span>}
                </span>
              ) : (
                <span className="hidden sm:inline">{label}</span>
              )}
            </div>
            {i < 1 && <ArrowRight className="w-3 h-3 text-[var(--color-border-default)] shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}

// ---- Column mapping (generic CSV) --------------------------------------------
function ColSelect({ label, value, headers, onChange }: { label: string; value: string | null; headers: string[]; onChange: (v: string) => void }) {
  const id = `col-${label}`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-[var(--color-text-tertiary)]">{label}</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-2 text-xs border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)]"
      >
        <option value="">—</option>
        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  )
}

// =============================================================================
export default function ImportPage() {
  const { t, tk } = useTranslation()
  const { format } = useMoney()
  const { ledger, accounts, categories } = useLedgerData()
  const providers = useMasterStore((s) => s.providers)
  const createAccount = useAccountsStore((s) => s.create)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [providerCode, setProviderCode] = useState<string>('generic_csv')
  const [accountId, setAccountId] = useState<string>('')
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [userMapping, setUserMapping] = useState<Partial<ColumnMapping>>({})
  const [previousJob, setPreviousJob] = useState<string | null>(null)
  const [job, setJob] = useState<Tables<'import_jobs'> | null>(null)
  const [importing, setImporting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const step: PageStep = result && rows.length > 0 && !job ? 'review' : 'setup'
  const provider = providers.find((p) => p.code === providerCode)
  const activeAccounts = accounts.filter((a) => !a.isArchived)
  const account = activeAccounts.find((a) => a.id === accountId)

  /** Account for a detected format: the ledger's account of that provider, else one is created for it. */
  async function resolveAccount(code: string): Promise<string | null> {
    if (!ledger) return null
    const existing = activeAccounts.find((a) => a.providerCode === code)
    if (existing) return existing.id
    const p = providers.find((x) => x.code === code)
    if (p && code !== 'generic_csv') {
      const created = await createAccount(ledger.id, {
        name: tk(p.name_key), accountTypeCode: p.account_type_code ?? 'bank', providerCode: code,
        currencyCode: ledger.currency_code, openingBalance: 0, openingDate: toLocalISODate(), color: p.color, includeInNetWorth: true,
      })
      toast.success(`${t.import.accountCreated.replace('{{name}}', created.name)}`)
      return created.id
    }
    return activeAccounts[0]?.id ?? null
  }

  async function loadSavedMapping(accId: string) {
    const { data } = await supabase.from('import_column_mappings').select('target_field, source_column').eq('account_id', accId).is('import_job_id', null)
    const m: Partial<ColumnMapping> = {}
    for (const [key, field] of MAPPING_FIELDS) {
      const hit = (data ?? []).find((d) => d.target_field === field)
      if (hit) (m as any)[key] = hit.source_column
    }
    return m
  }

  async function buildRows(res: ImportResult, accId: string) {
    const base: Row[] = res.rows.map((r) => ({
      ...r,
      selected: true,
      duplicate: false,
      categoryId: resolveCategoryId(r.categoryHint, categories)
        ?? categories.find((c) => c.is_active && c.type === r.type && c.keywords.some((k) => r.description.toLowerCase().includes(k.toLowerCase())))?.id
        ?? '',
    }))
    const payload = res.rows.map((r) => ({ row_number: r.rowNumber, date: r.date, amount: r.amount, type: r.type, description: r.description, external_id: r.externalId ?? null }))
    const { data: dups } = await supabase.rpc('check_import_duplicates', { p_account_id: accId, p_rows: payload })
    const dupSet = new Set((dups ?? []).map((d) => d.row_number))
    setRows(base.map((r) => (dupSet.has(r.rowNumber) ? { ...r, duplicate: true, selected: false } : r)))
  }

  async function processFile(f: File, mappingOverride?: Partial<ColumnMapping>, accountOverride?: string) {
    if (!ledger) return
    setLoading(true); setError(null); setResult(null); setRows([]); setJob(null); setPreviousJob(null); setFile(f)
    try {
      let code: string = 'generic_csv'
      let head = ''
      if (f.name.toLowerCase().endsWith('.pdf')) {
        code = providerCode !== 'generic_csv' ? providerCode : 'paypay'
      } else {
        head = await readHead(f)
        const guessed = autoDetectProvider(head.split('\n')[0].split(',').map((h) => h.trim()))
        if (guessed && providers.some((p) => p.code === guessed)) code = guessed
      }
      setProviderCode(code)
      const accId = accountOverride ?? (await resolveAccount(code))
      if (!accId) throw new Error(t.import.noAccount)
      setAccountId(accId)

      let mapOverride = mappingOverride ?? userMapping
      if (code === 'generic_csv' && head) {
        setMapping(detectColumnsFromCSV(head))
        if (!mappingOverride && Object.keys(userMapping).length === 0) {
          mapOverride = await loadSavedMapping(accId)
          setUserMapping(mapOverride)
        }
      } else {
        setMapping(null)
      }

      const checksum = await sha256(f)
      const { data: prev } = await supabase.from('import_jobs').select('created_at').eq('account_id', accId).eq('checksum', checksum).eq('status', 'completed').limit(1).maybeSingle()
      if (prev) setPreviousJob(prev.created_at)

      const res = await parseFile(f, code as PaymentProvider, mapOverride)
      setResult(res)
      if (res.rows.length === 0) setError(res.errors.join('\n') || t.import.errorNoTxns)
      else await buildRows(res, accId)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveMapping() {
    if (!account || !mapping) return
    const merged = { ...mapping, ...userMapping }
    await supabase.from('import_column_mappings').delete().eq('account_id', account.id).is('import_job_id', null)
    const insert = MAPPING_FIELDS.filter(([k]) => merged[k]).map(([k, field]) => ({ account_id: account.id, target_field: field, source_column: String(merged[k]) }))
    const { error: err } = await supabase.from('import_column_mappings').insert(insert)
    if (err) toast.error(err.message); else toast.success(t.txform.saved)
  }

  async function handleConfirm() {
    if (!ledger || !account || !file || !result) return
    setImporting(true)
    try {
      const { data, error: err } = await supabase.rpc('import_transactions', {
        p_ledger_id: ledger.id,
        p_account_id: account.id,
        p_provider_code: providerCode,
        p_file_name: file.name,
        p_file_type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'csv',
        p_checksum: await sha256(file),
        p_file_size: file.size,
        p_rows: rows.map((r) => ({
          row_number: r.rowNumber, date: r.date, amount: r.amount, type: r.type, description: r.description,
          external_id: r.externalId ?? null, category_id: r.categoryId || null, selected: r.selected,
          raw_line: r.rawLine ?? null, values: r.values,
        })),
      })
      if (err) throw err
      setJob(data)
      useTransactionsStore.setState((s) => ({ revision: s.revision + 1 }))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setImporting(false)
    }
  }

  function handleReset() {
    setFile(null); setResult(null); setRows([]); setError(null); setMapping(null); setUserMapping({})
    setJob(null); setPreviousJob(null); setProviderCode('generic_csv'); setAccountId('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const setRow = (n: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.rowNumber === n ? { ...r, ...patch } : r)))
  const selectedCount = rows.filter((r) => r.selected).length
  const summary = useMemo(() => {
    const sel = rows.filter((r) => r.selected)
    const income = sel.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
    const expense = sel.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
    return { income, expense, net: income - expense }
  }, [rows])
  const money = (n: number) => format(n, { from: account?.currencyCode as never, to: account?.currencyCode as never })

  return (
    <div className="animate-fade-in space-y-5">
      <div className="space-y-3">
        <PageHeader title={t.import.title} subtitle={t.import.subtitle} />
        <StepBar step={job ? 'review' : step} file={file} provider={step === 'review' || job ? provider : undefined} />
      </div>

      {step === 'setup' && !job && (
        <button
          type="button"
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) void processFile(f) }}
          onClick={() => !loading && fileInputRef.current?.click()}
          className={cn(
            'w-full rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none',
            dragging ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-50)]'
              : loading ? 'border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] cursor-wait'
              : 'border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-25)]',
          )}
        >
          <input ref={fileInputRef} type="file" accept=".csv,.pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f) }} />
          <span className="w-14 h-14 rounded-2xl bg-[var(--color-bg-sunken)] flex items-center justify-center mb-4">
            {loading
              ? <span className="w-6 h-6 border-2 border-[var(--color-interactive-primary)] border-t-transparent rounded-full animate-spin" />
              : <Upload className="w-7 h-7 text-[var(--color-text-quaternary)]" />}
          </span>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t.import.dropFile}</span>
          <span className="text-xs text-[var(--color-text-quaternary)] mt-1">{t.import.supportedFormats}</span>
          <span className="mt-4 px-5 py-2 rounded-lg bg-[var(--color-bg-sunken)] text-xs font-medium text-[var(--color-text-quaternary)]">
            {loading ? t.import.parsing : t.import.clickToBrowse}
          </span>
          <span className="mt-3 text-[11px] text-[var(--color-text-quaternary)] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {t.import.autoDetectHint}
          </span>
        </button>
      )}

      {mapping && providerCode === 'generic_csv' && !job && (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Globe className="w-4 h-4 text-[var(--color-interactive-primary)] shrink-0" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.import.colMapping}</p>
            <p className="text-xs text-[var(--color-text-quaternary)] ml-auto">{t.import.colMappingHint}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ColSelect label={t.import.colDate} value={userMapping.dateCol ?? mapping.dateCol} headers={mapping.headers} onChange={(v) => setUserMapping((m) => ({ ...m, dateCol: v }))} />
            <ColSelect label={t.import.colDesc} value={userMapping.descCol ?? mapping.descCol} headers={mapping.headers} onChange={(v) => setUserMapping((m) => ({ ...m, descCol: v }))} />
            {mapping.amountCol !== null ? (
              <ColSelect label={t.import.colAmount} value={userMapping.amountCol ?? mapping.amountCol} headers={mapping.headers} onChange={(v) => setUserMapping((m) => ({ ...m, amountCol: v, debitCol: null, creditCol: null }))} />
            ) : (
              <>
                <ColSelect label={t.import.colDebit} value={userMapping.debitCol ?? mapping.debitCol} headers={mapping.headers} onChange={(v) => setUserMapping((m) => ({ ...m, debitCol: v, amountCol: null }))} />
                <ColSelect label={t.import.colCredit} value={userMapping.creditCol ?? mapping.creditCol} headers={mapping.headers} onChange={(v) => setUserMapping((m) => ({ ...m, creditCol: v, amountCol: null }))} />
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => file && void processFile(file, userMapping, accountId || undefined)} disabled={loading || !file}>
              <RefreshCw className="w-3.5 h-3.5" />{t.import.reParse}
            </Button>
            <Button variant="ghost" size="sm" onClick={saveMapping}>{t.import.saveMapping}</Button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-status-loss-bg)] text-sm text-[var(--color-text-loss)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-0.5">{error.split('\n').map((e, i) => <p key={i}>{e}</p>)}</div>
          <button onClick={() => setError(null)} aria-label={t.common.close} className="shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {previousJob && !job && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-status-warning-bg)] text-sm text-[var(--color-text-warning)]">
          <Copy className="w-4 h-4" />{t.import.alreadyImported.replace('{{date}}', formatDate(previousJob))}
        </div>
      )}

      {step === 'review' && (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-[var(--color-border-subtle)] border-b border-[var(--color-border-default)]">
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-[var(--color-text-quaternary)] font-semibold uppercase tracking-wide">{t.transactions.txnTotal}</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{rows.length}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-[var(--color-text-quaternary)] font-semibold uppercase tracking-wide">{t.transactions.typeIncome}</p>
              <p className="text-sm font-bold tabular-nums text-[var(--color-text-gain)]">+{money(summary.income)}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-[var(--color-text-quaternary)] font-semibold uppercase tracking-wide">{t.transactions.typeExpense}</p>
              <p className="text-sm font-bold tabular-nums text-[var(--color-text-loss)]">−{money(summary.expense)}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-[var(--color-text-quaternary)] font-semibold uppercase tracking-wide">{t.dashboard.netPeriod}</p>
              <p className={cn('text-sm font-bold tabular-nums', summary.net >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                {summary.net >= 0 ? '+' : '−'}{money(Math.abs(summary.net))}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t.common.all}
                onClick={() => setRows((rs) => rs.map((r) => ({ ...r, selected: selectedCount !== rs.length })))}
                className={cn('rounded border-2 flex items-center justify-center transition-all',
                  selectedCount === rows.length ? 'bg-[var(--color-interactive-primary)] border-[var(--color-interactive-primary)]'
                    : selectedCount > 0 ? 'bg-[var(--color-brand-100)] border-[var(--color-brand-300)]'
                    : 'bg-[var(--color-surface-default)] border-[var(--color-border-default)]')}
                style={{ width: 18, height: 18, minWidth: 18 }}
              >
                {selectedCount === rows.length ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /> : selectedCount > 0 ? <Minus className="w-2.5 h-2.5 text-[var(--color-interactive-primary)]" strokeWidth={3} /> : null}
              </button>
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">{selectedCount} / {rows.length} {t.transactions.selected}</span>
              {result && result.errors.length > 0 && (
                <button onClick={() => setShowErrors((v) => !v)} className="text-xs text-[var(--color-text-warning)] font-medium hover:underline">
                  {result.errors.length} {t.import.warnings}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="imp-acc" className="text-xs text-[var(--color-text-tertiary)]">{t.import.targetAccount}</label>
              <select
                id="imp-acc"
                value={accountId}
                onChange={(e) => { setAccountId(e.target.value); if (file) void processFile(file, userMapping, e.target.value) }}
                className="h-8 px-2 text-xs border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-default)]"
              >
                {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button onClick={handleReset} className="flex items-center gap-1 text-xs text-[var(--color-text-quaternary)] hover:text-[var(--color-text-primary)]">
                <RotateCcw className="w-3.5 h-3.5" />{t.import.resetBtn}
              </button>
            </div>
          </div>

          {showErrors && result && result.errors.length > 0 && (
            <div className="px-4 py-2.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-status-warning-bg)] space-y-1 max-h-28 overflow-y-auto">
              {result.errors.map((e, i) => <p key={i} className="text-xs text-[var(--color-text-warning)]">{e}</p>)}
            </div>
          )}

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-default)] z-10">
                <tr>
                  <th className="py-2 pl-3 pr-1 w-8" />
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-quaternary)] whitespace-nowrap">{t.transactions.date}</th>
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-quaternary)]">{t.transactions.labelType}</th>
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-quaternary)]">{t.transactions.content}</th>
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-quaternary)] hidden sm:table-cell">{t.transactions.labelCategory}</th>
                  <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-quaternary)]">{t.transactions.amount}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isIncome = r.type === 'income'
                  return (
                    <tr key={r.rowNumber} className={cn('border-t border-[var(--color-border-subtle)] transition-colors', !r.selected && 'opacity-40')}>
                      <td className="py-2.5 pl-3 pr-1 w-8">
                        <input type="checkbox" aria-label={r.description} checked={r.selected} onChange={(e) => setRow(r.rowNumber, { selected: e.target.checked })} className="accent-[var(--color-interactive-primary)]" />
                      </td>
                      <td className="py-2.5 px-2 text-xs text-[var(--color-text-quaternary)] whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="py-2.5 px-2">
                        <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                          isIncome ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]')}>
                          {isIncome ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {isIncome ? t.transactions.typeIncome : t.transactions.typeExpense}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 max-w-[220px]">
                        <p className="text-sm text-[var(--color-text-primary)] truncate">{r.description}</p>
                        {r.duplicate && <span className="text-[10px] px-1.5 rounded bg-[var(--color-status-warning-bg)] text-[var(--color-text-warning)]">{t.import.statusDuplicate}</span>}
                      </td>
                      <td className="py-2.5 px-2 hidden sm:table-cell">
                        <select
                          aria-label={t.transactions.labelCategory}
                          value={r.categoryId}
                          onChange={(e) => setRow(r.rowNumber, { categoryId: e.target.value })}
                          className="h-7 max-w-[160px] rounded-md border border-[var(--color-border-subtle)] bg-transparent text-xs text-[var(--color-text-secondary)] px-1"
                        >
                          <option value="">{t.txform.uncategorized}</option>
                          {categoryTreeOptions(categories.filter((c) => c.is_active && c.type === r.type)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className={cn('text-sm font-semibold tabular-nums', isIncome ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                          {isIncome ? '+' : '−'}{money(r.amount)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 text-sm text-[var(--color-text-secondary)]">
              {selectedCount > 0 ? t.import.importItems.replace('{{count}}', String(selectedCount)) : <span className="text-[var(--color-text-quaternary)]">{t.import.selectAtLeastOne}</span>}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={handleReset} className="flex-1 sm:flex-none">{t.import.resetBtn}</Button>
              <Button onClick={handleConfirm} loading={importing} disabled={selectedCount === 0 || !account} size="lg" className="flex-1 sm:flex-none sm:min-w-[180px]">
                <CheckCircle2 className="w-4 h-4" />
                {importing ? t.import.importing : t.import.importBtn.replace('{{count}}', String(selectedCount))}
              </Button>
            </div>
          </div>
        </div>
      )}

      {job && (
        <div className="rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-100)] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-brand-600)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-brand-700)]">{t.import.importSuccess.replace('{{count}}', String(job.imported_rows))}</p>
              <p className="text-xs text-[var(--color-brand-600)] mt-0.5">
                {job.duplicate_rows > 0 && `${t.import.duplicatesSkipped.replace('{{count}}', String(job.duplicate_rows))} · `}
                {account?.name} · {t.import.checkDashboard}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/transactions"><Button size="sm">{t.dashboard.viewAll}</Button></Link>
            <Button variant="secondary" size="sm" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5" />{t.import.importAnother}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
