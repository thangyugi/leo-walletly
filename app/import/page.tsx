'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Upload, CheckCircle2, AlertCircle, X, Sparkles, RefreshCw, Globe, RotateCcw, Check, Minus, Plus, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/page-header'
import { parseFile, detectColumnsFromCSV, autoDetectProvider } from '@/features/import/parsers'
import type { ColumnMapping } from '@/features/import/parsers'
import { resolveCategoryId } from '@/features/categories/store'
import { useMasterStore } from '@/features/master/store'
import { useTransactionsStore } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { supabase } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'
import type { ImportResult, PaymentProvider, ParsedImportRow } from '@/types'
import type { Tables } from '@/types/supabase'

type Row = ParsedImportRow & { selected: boolean; categoryId: string; duplicate: boolean }

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

export default function ImportPage() {
  const { t, tk } = useTranslation()
  const { format } = useMoney()
  const { ledger, accounts, categories } = useLedgerData()
  const providers = useMasterStore((s) => s.providers)
  const bump = () => useTransactionsStore.setState((s) => ({ revision: s.revision + 1 }))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeAccounts = accounts.filter((a) => !a.isArchived)
  const [accountId, setAccountId] = useState('')
  const account = activeAccounts.find((a) => a.id === accountId) ?? activeAccounts[0]
  const importable = providers.filter((p) => p.is_active && (p.supports_csv || p.supports_pdf) && p.parser_code)
  const [providerCode, setProviderCode] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [userMapping, setUserMapping] = useState<Partial<ColumnMapping>>({})
  const [previousJob, setPreviousJob] = useState<string | null>(null)
  const [job, setJob] = useState<Tables<'import_jobs'> | null>(null)
  const [importing, setImporting] = useState(false)

  // The account's provider is the default format (e.g. a PayPay wallet → PayPay CSV).
  useEffect(() => {
    if (account && !providerCode) setProviderCode(account.providerCode && importable.some((p) => p.code === account.providerCode) ? account.providerCode : 'generic_csv')
  }, [account, providerCode, importable])

  const provider = importable.find((p) => p.code === providerCode)

  async function loadSavedMapping(accId: string) {
    const { data } = await supabase.from('import_column_mappings').select('target_field, source_column').eq('account_id', accId).is('import_job_id', null)
    if (!data?.length) return {}
    const m: Partial<ColumnMapping> = {}
    for (const [key, field] of MAPPING_FIELDS) {
      const hit = data.find((d) => d.target_field === field)
      if (hit) (m as any)[key] = hit.source_column
    }
    return m
  }

  async function buildRows(res: ImportResult) {
    if (!account) return
    const base: Row[] = res.rows.map((r) => ({
      ...r,
      selected: true,
      duplicate: false,
      categoryId: resolveCategoryId(r.categoryHint, categories)
        ?? categories.find((c) => c.is_active && c.type === r.type && c.keywords.some((k) => r.description.toLowerCase().includes(k.toLowerCase())))?.id
        ?? '',
    }))
    const payload = res.rows.map((r) => ({ row_number: r.rowNumber, date: r.date, amount: r.amount, type: r.type, description: r.description, external_id: r.externalId ?? null }))
    const { data: dups } = await supabase.rpc('check_import_duplicates', { p_account_id: account.id, p_rows: payload })
    const dupSet = new Set((dups ?? []).map((d) => d.row_number))
    setRows(base.map((r) => (dupSet.has(r.rowNumber) ? { ...r, duplicate: true, selected: false } : r)))
  }

  async function processFile(f: File, mappingOverride?: Partial<ColumnMapping>) {
    if (!account || !ledger) return
    setLoading(true); setError(null); setResult(null); setRows([]); setJob(null); setPreviousJob(null); setFile(f)
    try {
      let code = providerCode as PaymentProvider
      let mapOverride = mappingOverride ?? userMapping
      if (!f.name.toLowerCase().endsWith('.pdf')) {
        const head = await readHead(f)
        const guessed = autoDetectProvider(head.split('\n')[0].split(',').map((h) => h.trim()))
        if (guessed && importable.some((p) => p.code === guessed)) code = guessed
        if (code === 'generic_csv') {
          setMapping(detectColumnsFromCSV(head))
          if (!mappingOverride && Object.keys(userMapping).length === 0) {
            mapOverride = await loadSavedMapping(account.id)
            setUserMapping(mapOverride)
          }
        } else setMapping(null)
      }
      setProviderCode(code)
      const checksum = await sha256(f)
      const { data: prev } = await supabase.from('import_jobs').select('created_at').eq('account_id', account.id).eq('checksum', checksum).eq('status', 'completed').limit(1).maybeSingle()
      if (prev) setPreviousJob(prev.created_at)
      const res = await parseFile(f, code, mapOverride)
      setResult(res)
      if (res.rows.length === 0) setError(res.errors.join('\n') || t.import.errorNoTxns)
      else await buildRows(res)
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

  async function confirmImport() {
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
      bump()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setFile(null); setResult(null); setRows([]); setError(null); setMapping(null); setUserMapping({}); setJob(null); setPreviousJob(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const selectedRows = rows.filter((r) => r.selected)
  const totals = useMemo(() => ({
    income: selectedRows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0),
    expense: selectedRows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
  }), [selectedRows])
  const dupCount = rows.filter((r) => r.duplicate).length
  const setRow = (n: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.rowNumber === n ? { ...r, ...patch } : r)))

  if (activeAccounts.length === 0) {
    return (
      <div className="animate-fade-in space-y-5">
        <PageHeader title={t.import.title} subtitle={t.import.subtitle} />
        <div className="card-base p-10 text-center space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">{t.import.noAccount}</p>
          <Link href="/accounts"><Button icon={<Plus />}>{t.import.addAccount}</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.import.title} subtitle={t.import.subtitle} />

      {job ? (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-status-gain-bg)] p-5 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[var(--color-text-gain)] shrink-0" />
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{t.import.importSuccess.replace('{{count}}', String(job.imported_rows))}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {job.duplicate_rows > 0 && `${t.import.duplicatesSkipped.replace('{{count}}', String(job.duplicate_rows))} · `}
                {account?.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/transactions"><Button size="sm">{t.dashboard.viewAll}</Button></Link>
            <Link href="/categories/classify"><Button size="sm" variant="outline">{t.classify.title}</Button></Link>
            <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={reset}>{t.import.importAnother}</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label={t.import.targetAccount} value={account?.id ?? ''} onChange={(e) => { setAccountId(e.target.value); setProviderCode(''); reset() }}>
              {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currencyCode})</option>)}
            </Select>
            <Select label={t.import.provider} value={providerCode} onChange={(e) => { setProviderCode(e.target.value); reset() }}>
              {importable.map((p) => <option key={p.code} value={p.code}>{tk(p.name_key)}{p.supports_pdf ? ' · CSV/PDF' : ' · CSV'}</option>)}
            </Select>
          </div>

          {!result && (
            <div
              role="button" tabIndex={0} aria-label={t.import.dropFile}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) void processFile(f) }}
              onClick={() => !loading && fileInputRef.current?.click()}
              className={cn('rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer',
                dragging ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:border-[var(--color-interactive-primary)]')}>
              <input ref={fileInputRef} type="file" accept={provider?.supports_pdf ? '.csv,.pdf' : '.csv'} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f) }} />
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-sunken)] flex items-center justify-center mb-4">
                {loading ? <span className="w-6 h-6 border-2 border-[var(--color-interactive-primary)] border-t-transparent rounded-full animate-spin" /> : <Upload className="w-7 h-7 text-[var(--color-text-tertiary)]" />}
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.import.dropFile}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{provider ? tk(provider.description_key ?? provider.name_key) : t.import.supportedFormats}</p>
              <p className="mt-3 text-[11px] text-[var(--color-text-quaternary)] flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />{t.import.autoDetectHint}</p>
            </div>
          )}

          {mapping && providerCode === 'generic_csv' && (
            <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Globe className="w-4 h-4 text-[var(--color-interactive-primary)]" />
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.import.colMapping}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] ml-auto">{t.import.colMappingHint}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([['dateCol', t.import.colDate], ['descCol', t.import.colDesc], ...(mapping.amountCol !== null ? [['amountCol', t.import.colAmount]] : [['debitCol', t.import.colDebit], ['creditCol', t.import.colCredit]])] as [keyof ColumnMapping, string][]).map(([k, label]) => (
                  <Select key={k} label={label} value={String(userMapping[k] ?? mapping[k] ?? '')} onChange={(e) => setUserMapping((m) => ({ ...m, [k]: e.target.value || null }))}>
                    <option value="">—</option>
                    {mapping.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={() => file && void processFile(file, userMapping)} disabled={loading || !file}>{t.import.reParse}</Button>
                <Button variant="ghost" size="sm" onClick={saveMapping}>{t.import.saveMapping}</Button>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-status-loss-bg)] text-sm text-[var(--color-text-loss)]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">{error.split('\n').map((e, i) => <p key={i}>{e}</p>)}</div>
              <button onClick={() => setError(null)} aria-label={t.common.close}><X className="w-4 h-4" /></button>
            </div>
          )}

          {previousJob && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-status-warning-bg)] text-sm text-[var(--color-text-warning)]">
              <Copy className="w-4 h-4" />{t.import.alreadyImported.replace('{{date}}', formatDate(previousJob))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] overflow-hidden">
              <div className="grid grid-cols-4 divide-x divide-[var(--color-border-subtle)] border-b border-[var(--color-border-default)] text-center">
                {[[t.transactions.count, `${selectedRows.length} / ${rows.length}`], [t.import.statusDuplicate, String(dupCount)], [t.transactions.typeIncome, `+${format(totals.income)}`], [t.transactions.typeExpense, `−${format(totals.expense)}`]].map(([l, v]) => (
                  <div key={l} className="px-3 py-3"><p className="text-[10px] font-semibold uppercase text-[var(--color-text-quaternary)]">{l}</p><p className="text-sm font-bold font-tabular text-[var(--color-text-primary)]">{v}</p></div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
                <button onClick={() => setRows((rs) => rs.map((r) => ({ ...r, selected: selectedRows.length !== rows.length })))} className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-[18px] h-[18px] rounded border-2 border-[var(--color-interactive-primary)] flex items-center justify-center">
                    {selectedRows.length === rows.length ? <Check className="w-2.5 h-2.5" /> : selectedRows.length > 0 ? <Minus className="w-2.5 h-2.5" /> : null}
                  </span>
                  {t.common.all}
                </button>
                {result && result.errors.length > 0 && <span className="text-xs text-[var(--color-text-warning)]">{result.errors.length} {t.import.warnings}</span>}
                <button onClick={reset} className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]"><RotateCcw className="w-3.5 h-3.5" />{t.import.resetBtn}</button>
              </div>
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--color-bg-sunken)] z-10 text-[10px] uppercase text-[var(--color-text-quaternary)]">
                    <tr><th className="w-8" /><th className="text-left px-2 py-2">{t.transactions.date}</th><th className="text-left px-2">{t.transactions.content}</th><th className="text-left px-2 hidden sm:table-cell">{t.txform.category}</th><th className="text-right px-3">{t.transactions.amount}</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.rowNumber} className={cn('border-t border-[var(--color-border-subtle)]', !r.selected && 'opacity-50')}>
                        <td className="pl-3"><input type="checkbox" aria-label={r.description} checked={r.selected} onChange={(e) => setRow(r.rowNumber, { selected: e.target.checked })} className="accent-[var(--color-interactive-primary)]" /></td>
                        <td className="px-2 py-2 text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="px-2 max-w-[260px]">
                          <p className="truncate text-[var(--color-text-primary)]">{r.description}</p>
                          {r.duplicate && <span className="text-[10px] px-1.5 rounded bg-[var(--color-status-warning-bg)] text-[var(--color-text-warning)]">{t.import.statusDuplicate}</span>}
                        </td>
                        <td className="px-2 hidden sm:table-cell">
                          <select aria-label={t.txform.category} value={r.categoryId} onChange={(e) => setRow(r.rowNumber, { categoryId: e.target.value })}
                            className="h-8 w-44 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-xs px-1">
                            <option value="">{t.txform.uncategorized}</option>
                            {categories.filter((c) => c.is_active && c.type === r.type).map((c) => <option key={c.id} value={c.id}>{c.parent_id ? '— ' : ''}{c.name}</option>)}
                          </select>
                        </td>
                        <td className={cn('px-3 text-right font-tabular font-semibold whitespace-nowrap', r.type === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                          {r.type === 'income' ? '+' : '−'}{format(r.amount, { from: account?.currencyCode as never, to: account?.currencyCode as never })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-[var(--color-border-default)] flex flex-col sm:flex-row items-center gap-3">
                <p className="flex-1 text-sm text-[var(--color-text-secondary)]">
                  {selectedRows.length > 0 ? t.import.importItems.replace('{{count}}', String(selectedRows.length)) : t.import.selectAtLeastOne}
                </p>
                <Button onClick={confirmImport} loading={importing} disabled={selectedRows.length === 0} size="lg" icon={<CheckCircle2 />}>
                  {importing ? t.import.importing : t.import.importBtn.replace('{{count}}', String(selectedRows.length))}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
