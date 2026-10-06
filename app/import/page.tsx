'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Lock, FileWarning,
  Upload, CheckCircle2, AlertCircle, X, Sparkles, RefreshCw, Globe, RotateCcw,
  ArrowRight, Check, TrendingDown, TrendingUp, Minus, Copy, ArrowLeftRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AccountPicker, CategoryPicker } from '@/components/ui/picker'
import { PageHeader } from '@/components/layout/page-header'
import { parseFile, detectColumnsFromCSV, autoDetectProvider } from '@/features/import/parsers'
import type { ColumnMapping } from '@/features/import/parsers'
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
import { AppSelect } from '@/components/ui/app-select'

type PageStep = 'setup' | 'review'
/** ruleCategoryId: what the ledger's own rules give the row (the preview's default). */
type Row = ParsedImportRow & { selected: boolean; categoryId: string; ruleCategoryId: string; duplicate: boolean }

/** A top-up with no other account picked is booked as income/expense (the old behaviour). */
function effType(r: ParsedImportRow, otherId: string): 'expense' | 'income' | 'transfer' {
  if (r.type !== 'transfer') return r.type
  if (otherId) return 'transfer'
  return r.direction === 'out' ? 'expense' : 'income'
}

function rowPayload(r: ParsedImportRow, otherId: string) {
  const type = effType(r, otherId)
  return {
    row_number: r.rowNumber, date: r.date, amount: r.amount, type, description: r.description,
    external_id: r.externalId ?? null,
    ...(type === 'transfer' ? { direction: r.direction, transfer_account_id: otherId } : {}),
  }
}

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
                : 'bg-[var(--color-surface-default)] border border-[var(--color-border-default)] text-[var(--color-text-quaternary)]',
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
      <AppSelect
        id={id}
        aria-label={label}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-2 text-xs border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)]"
      >
        <option value="">—</option>
        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </AppSelect>
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
  // The other side of top-ups (e.g. PayPayカード for a PayPay wallet); '' = book them as income/expense.
  const [otherAccountId, setOtherAccountId] = useState('')
  const [importing, setImporting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  // A PDF that could not be read: why (password, unknown kind…), with what was read.
  const [pdfIssue, setPdfIssue] = useState<ImportResult | null>(null)
  const [pdfPassword, setPdfPassword] = useState('')

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

  /** Where a wallet is loaded from / a card loads into: PayPay ↔ PayPayカード, else nothing. */
  function guessOtherAccount(accId: string, res: ImportResult) {
    if (!res.rows.some((r) => r.type === 'transfer')) return ''
    const acc = activeAccounts.find((a) => a.id === accId)
    const others = activeAccounts.filter((a) => a.id !== accId && a.currencyCode === acc?.currencyCode)
    const pair: Record<string, string> = { paypay: 'paypay_card', paypay_card: 'paypay' }
    const want = acc?.providerCode ? pair[acc.providerCode] : undefined
    return (want && others.find((a) => a.providerCode === want)?.id) || ''
  }

  async function buildRows(res: ImportResult, accId: string, otherId: string) {
    const payload = res.rows.map((r) => rowPayload(r, otherId))
    // Categories come only from the ledger's rules (keywords / active rules),
    // exactly as the import will apply them; anything else stays uncategorized.
    const [{ data: dups }, { data: matched }] = await Promise.all([
      supabase.rpc('check_import_duplicates', { p_account_id: accId, p_rows: payload }),
      ledger ? supabase.rpc('preview_category_rules', { p_ledger_id: ledger.id, p_account_id: accId, p_rows: payload }) : Promise.resolve({ data: [] }),
    ])
    const ruleBy = new Map((matched ?? []).map((m) => [m.row_number, m.category_id]))
    const base: Row[] = res.rows.map((r) => {
      const ruleCategoryId = ruleBy.get(r.rowNumber) ?? ''
      return { ...r, selected: true, duplicate: false, categoryId: ruleCategoryId, ruleCategoryId }
    })
    const dupSet = new Set((dups ?? []).map((d) => d.row_number))
    setRows(base.map((r) => (dupSet.has(r.rowNumber) ? { ...r, duplicate: true, selected: false } : r)))
  }

  async function processFile(f: File, mappingOverride?: Partial<ColumnMapping>, accountOverride?: string, password?: string) {
    if (!ledger) return
    setLoading(true); setError(null); setResult(null); setRows([]); setJob(null); setPreviousJob(null); setFile(f); setPdfIssue(null)
    try {
      let code: string = 'generic_csv'
      let head = ''
      // A PDF says which statement it is only once read (楽天カード / PayPay),
      // so parse it first and take the account from what was recognised.
      let pdfRes: ImportResult | null = null
      if (f.name.toLowerCase().endsWith('.pdf')) {
        pdfRes = await parseFile(f, 'paypay', undefined, password)
        // Nothing read: say why, and don't pick or create an account for it.
        if (pdfRes.rows.length === 0) { setPdfIssue(pdfRes); return }
        setPdfPassword('')
        code = providers.some((p) => p.code === pdfRes!.provider) ? pdfRes.provider : 'generic_csv'
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

      const res = pdfRes ?? await parseFile(f, code as PaymentProvider, mapOverride)
      setResult(res)
      if (res.rows.length === 0) setError(res.errors.join('\n') || t.import.errorNoTxns)
      else {
        const other = guessOtherAccount(accId, res)
        setOtherAccountId(other)
        await buildRows(res, accId, other)
      }
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
          ...rowPayload(r, otherAccountId),
          // Left to the import's own rule pass (recorded as a rule match) unless picked by hand.
          category_id: r.categoryId && r.categoryId !== r.ruleCategoryId ? r.categoryId : null,
          selected: r.selected,
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
    setFile(null); setResult(null); setRows([]); setError(null); setMapping(null); setUserMapping({}); setPdfIssue(null); setPdfPassword('')
    setJob(null); setPreviousJob(null); setProviderCode('generic_csv'); setAccountId(''); setOtherAccountId('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const setRow = (n: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.rowNumber === n ? { ...r, ...patch } : r)))
  const selectedCount = rows.filter((r) => r.selected).length
  const summary = useMemo(() => {
    const sel = rows.filter((r) => r.selected)
    const income = sel.filter((r) => effType(r, otherAccountId) === 'income').reduce((s, r) => s + r.amount, 0)
    const expense = sel.filter((r) => effType(r, otherAccountId) === 'expense').reduce((s, r) => s + r.amount, 0)
    return { income, expense, net: income - expense }
  }, [rows, otherAccountId])
  const hasTransfers = rows.some((r) => r.type === 'transfer')
  const otherAccount = activeAccounts.find((a) => a.id === otherAccountId)
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

      {pdfIssue && file && (
        <PdfIssueCard issue={pdfIssue} providerName={(code) => { const p = providers.find((x) => x.code === code); return p ? tk(p.name_key) : code ?? '' }}
          password={pdfPassword} onPassword={setPdfPassword} busy={loading}
          onOpen={() => void processFile(file, undefined, undefined, pdfPassword)} onReset={handleReset} />
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
          <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x divide-[var(--color-border-subtle)] border-b border-[var(--color-border-default)] max-sm:[&>*:nth-child(-n+2)]:border-b max-sm:[&>*:nth-child(odd)]:border-r max-sm:[&>*]:border-[var(--color-border-subtle)]">
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
              <span className="text-xs text-[var(--color-text-tertiary)]">{t.import.targetAccount}</span>
              <AccountPicker
                aria-label={t.import.targetAccount}
                size="sm"
                className="w-52"
                accounts={activeAccounts}
                value={accountId}
                onChange={(v) => { setAccountId(v); if (file) void processFile(file, userMapping, v) }}
              />
              <button onClick={handleReset} className="flex items-center gap-1 text-xs text-[var(--color-text-quaternary)] hover:text-[var(--color-text-primary)]">
                <RotateCcw className="w-3.5 h-3.5" />{t.import.resetBtn}
              </button>
            </div>
          </div>

          {hasTransfers && (
            <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-[var(--color-border-default)]">
              <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] shrink-0" />
              <span className="text-xs text-[var(--color-text-secondary)] flex-1 min-w-[180px]">
                {t.import.topUpsFound.replace('{{count}}', String(rows.filter((r) => r.type === 'transfer').length))}
              </span>
              <AccountPicker
                aria-label={t.import.topUpAccount}
                size="sm"
                className="w-56"
                accounts={activeAccounts.filter((a) => a.id !== accountId && a.currencyCode === account?.currencyCode)}
                extra={[{ value: '', label: t.import.topUpNone }]}
                value={otherAccountId}
                onChange={(v) => { setOtherAccountId(v); if (result) void buildRows(result, accountId, v) }}
              />
            </div>
          )}

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
                  <th className="max-sm:hidden py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-quaternary)]">{t.transactions.labelType}</th>
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-quaternary)]">{t.transactions.content}</th>
                  <th className="py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-quaternary)] hidden sm:table-cell">{t.transactions.labelCategory}</th>
                  <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-quaternary)]">{t.transactions.amount}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const type = effType(r, otherAccountId)
                  const isIncome = type === 'income'
                  const isTransfer = type === 'transfer'
                  const transferIn = r.direction !== 'out'
                  return (
                    <tr key={r.rowNumber} className={cn('border-t border-[var(--color-border-subtle)] transition-colors', !r.selected && 'opacity-40')}>
                      <td className="py-2.5 pl-3 pr-1 w-8">
                        <input type="checkbox" aria-label={r.description} checked={r.selected} onChange={(e) => setRow(r.rowNumber, { selected: e.target.checked })} className="accent-[var(--color-interactive-primary)]" />
                      </td>
                      <td className="py-2.5 px-2 text-xs text-[var(--color-text-quaternary)] whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="max-sm:hidden py-2.5 px-2">
                        <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                          isTransfer ? 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]'
                            : isIncome ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]')}>
                          {isTransfer ? <ArrowLeftRight className="w-2.5 h-2.5" /> : isIncome ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {isTransfer ? t.transactions.transfer : isIncome ? t.transactions.typeIncome : t.transactions.typeExpense}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 max-w-[220px] max-sm:max-w-0 max-sm:w-full">
                        <p className="text-sm text-[var(--color-text-primary)] truncate">{r.description}</p>
                        {r.duplicate && <span className="text-[10px] px-1.5 rounded bg-[var(--color-status-warning-bg)] text-[var(--color-text-warning)]">{t.import.statusDuplicate}</span>}
                        {isTransfer && (
                          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5 truncate">
                            {(transferIn ? t.import.topUpFrom : t.import.topUpTo).replace('{{name}}', otherAccount?.name ?? '—')}
                          </p>
                        )}
                        {/* Phones have no category column: the picker sits under the text. */}
                        {!isTransfer && <CategoryPicker
                          aria-label={t.transactions.labelCategory}
                          size="sm"
                          className="sm:hidden mt-1.5"
                          categories={categories.filter((c) => c.is_active && c.type === type)}
                          noneLabel={t.txform.uncategorized}
                          value={r.categoryId}
                          onChange={(v) => setRow(r.rowNumber, { categoryId: v })}
                        />}
                      </td>
                      <td className="py-2.5 px-2 hidden sm:table-cell">
                        {isTransfer ? <span className="text-xs text-[var(--color-text-quaternary)]">—</span> : <CategoryPicker
                          aria-label={t.transactions.labelCategory}
                          size="sm"
                          className="w-44"
                          categories={categories.filter((c) => c.is_active && c.type === type)}
                          noneLabel={t.txform.uncategorized}
                          value={r.categoryId}
                          onChange={(v) => setRow(r.rowNumber, { categoryId: v })}
                        />}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className={cn('text-sm font-semibold tabular-nums',
                          isTransfer ? 'text-[var(--color-text-secondary)]' : isIncome ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                          {(isTransfer ? transferIn : isIncome) ? '+' : '−'}{money(r.amount)}
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

/**
 * A PDF that gave no rows: what happened in plain words, what to do next and,
 * for unknown layouts, the text that was read (to copy and send).
 */
function PdfIssueCard({ issue, providerName, password, onPassword, busy, onOpen, onReset }: {
  issue: ImportResult
  providerName: (code: string | null | undefined) => string
  password: string
  onPassword: (v: string) => void
  busy: boolean
  onOpen: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const [showText, setShowText] = useState(false)
  const name = providerName(issue.detected)
  const code = issue.errorCode ?? 'pdf_unknown'
  const isPassword = code === 'pdf_password' || code === 'pdf_password_wrong'
  const title = {
    pdf_password: t.import.pdfPasswordTitle, pdf_password_wrong: t.import.pdfPasswordTitle, pdf_read: t.import.pdfReadTitle,
    pdf_unknown: t.import.pdfUnknownTitle, pdf_no_rows: t.import.pdfNoRowsTitle.replace('{{provider}}', name),
    pdf_unsupported: t.import.pdfUnsupportedTitle.replace('{{provider}}', name),
  }[code]
  const sub = {
    pdf_password: t.import.pdfPasswordSub, pdf_password_wrong: t.import.pdfPasswordWrong, pdf_read: t.import.pdfReadSub,
    pdf_unknown: t.import.pdfUnknownSub, pdf_no_rows: t.import.pdfNoRowsSub,
    pdf_unsupported: t.import.pdfUnsupportedSub.replace(/\{\{provider\}\}/g, name),
  }[code]
  const preview = issue.preview ?? []
  return (
    <div role="alert" className="rounded-[14px] border border-[#fedf89] bg-[var(--color-surface-default)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-4 bg-[linear-gradient(180deg,#fffaeb,var(--color-surface-default))]">
        <span className="w-10 h-10 rounded-xl bg-[#fef0c7] text-[#b54708] flex items-center justify-center shrink-0">
          {isPassword ? <Lock className="w-5 h-5" /> : <FileWarning className="w-5 h-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">{title}</p>
          <p className={cn('text-[13px] mt-0.5 leading-relaxed', code === 'pdf_password_wrong' ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-secondary)]')}>{sub}</p>
          {issue.detected && <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">{t.import.detectedAs.replace('{{provider}}', name)}</p>}
          {/* The reader's own error (e.g. a browser gap), so a report can say what failed. */}
          {code === 'pdf_read' && issue.errors.length > 0 && (
            <p className="text-[11.5px] text-[var(--color-text-quaternary)] mt-1 font-mono break-all">{issue.errors[0].slice(0, 200)}</p>
          )}
        </div>
      </div>
      {isPassword && (
        <form className="flex gap-2 px-4 pb-4" onSubmit={(e) => { e.preventDefault(); if (password) onOpen() }}>
          <input type="password" autoComplete="off" value={password} onChange={(e) => onPassword(e.target.value)} aria-label={t.import.pdfPasswordTitle}
            className="flex-1 h-10 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-sm outline-none focus:border-[var(--color-interactive-primary)]" />
          <Button type="submit" size="sm" disabled={!password || busy} className="h-10">{t.import.pdfOpen}</Button>
        </form>
      )}
      {!isPassword && (
        <div className="px-4 pb-4 space-y-3">
          <div className="text-[12.5px] text-[var(--color-text-secondary)]">
            <p className="font-semibold text-[var(--color-text-primary)] mb-1">{t.import.supported}</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>{t.import.supportedPdf}</li>
              <li>{t.import.supportedCsv}</li>
            </ul>
          </div>
          {preview.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border-default)]">
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => setShowText((v) => !v)} className="flex-1 text-left text-[12.5px] font-medium text-[var(--color-text-secondary)]">
                  {showText ? '▾' : '▸'} {t.import.pdfPreview.replace('{{count}}', String(preview.length))}
                </button>
                <button type="button" onClick={() => { void navigator.clipboard.writeText(preview.join('\n')).then(() => toast.success(t.import.copied)) }}
                  className="text-[12px] font-medium text-[var(--color-interactive-primary)] hover:underline">{t.import.copy}</button>
              </div>
              {showText && (
                <pre className="max-h-64 overflow-auto px-3 pb-3 text-[11.5px] leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap break-all font-mono">{preview.join('\n')}</pre>
              )}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onReset}>{t.import.tryAnother}</Button>
        </div>
      )}
    </div>
  )
}
