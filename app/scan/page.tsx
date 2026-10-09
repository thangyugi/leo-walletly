'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Camera, RotateCcw, Save, ScanLine, Image as ImageIcon,
  CheckCircle2, AlertCircle, Key, ZoomIn, ZoomOut,
  Upload, ChevronDown, ChevronUp, ArrowRight, Plus, Trash2,
  Sun, Smartphone, Maximize, Layers, Focus, Check, X,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccountPicker, CategoryPicker } from '@/components/ui/picker'
import { AmountInput } from '@/components/ui/amount-input'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore } from '@/stores/transactions'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import { categoryTreeOptions } from '@/features/categories/types'
import { CategoryIcon } from '@/features/categories/category-icon'
import { AccountBadge } from '@/components/ui/picker'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn, toLocalISODate, getInitials } from '@/lib/utils'
import { formatMoney, getCurrencyPrecision } from '@/lib/money'
import type { ReceiptItem } from '@/types'
import type { Account } from '@/features/accounts/store'

type ScanState = 'idle' | 'previewing' | 'scanning' | 'confirming' | 'error' | 'saved'

interface ScanResult {
  storeName: string
  totalAmount: number
  taxAmount?: number
  date: string
  paymentMethod?: string
  categoryId?: string | null
  items?: ReceiptItem[]
}

/** One receipt line on the confirm screen; each carries its own category. */
type ItemSource = 'rule' | 'ai' | 'manual' | null
interface EditItem {
  key: string
  name: string
  quantity: number
  amount: string
  categoryId: string
  source: ItemSource
}

const num = (v: string) => parseFloat(v.replace(/,/g, '')) || 0

/**
 * The account a receipt was paid from, by what the receipt says: a matching
 * provider (PayPay, 楽天ペイ), else an account of that kind, else cash —
 * a receipt that doesn't say is usually a cash purchase.
 */
function pickAccount(method: string | undefined, accounts: Account[]): string {
  const provider: Record<string, string> = { paypay: 'paypay', rakuten_pay: 'rakuten_pay' }
  const ofType = (type: string) => accounts.find((a) => a.accountTypeCode === type)
  const hit =
    (method && provider[method] && accounts.find((a) => a.providerCode === provider[method])) ||
    (method === 'credit_card' && ofType('credit_card')) ||
    (method && ['ic_card', 'e_money', 'd_barai', 'au_pay', 'merpay'].includes(method) &&
      accounts.find((a) => a.accountTypeCode === 'e_wallet' && !['paypay', 'rakuten_pay'].includes(a.providerCode ?? ''))) ||
    ofType('cash') ||
    accounts[0]
  return hit ? hit.id : ''
}

/**
 * Same split as save_receipt: one amount per category, the receipt total spread
 * in proportion (tax, discounts, rounding), the largest taking the remainder;
 * a category netting ≤ 0 folds into the largest.
 */
function splitByCategory(items: EditItem[], total: number, precision: number) {
  const groups = new Map<string, { amount: number; count: number }>()
  for (const it of items) {
    const g = groups.get(it.categoryId) ?? { amount: 0, count: 0 }
    g.amount += num(it.amount); g.count += 1
    groups.set(it.categoryId, g)
  }
  const positive = [...groups.entries()].filter(([, g]) => g.amount > 0).sort((a, b) => b[1].amount - a[1].amount)
  const sum = positive.reduce((s, [, g]) => s + g.amount, 0)
  if (sum <= 0 || total <= 0) return []
  const f = 10 ** precision
  const out = positive.map(([categoryId, g]) => ({ categoryId, count: g.count, amount: Math.round((total * g.amount / sum) * f) / f }))
  out[0].amount = Math.round((total - out.slice(1).reduce((s, x) => s + x.amount, 0)) * f) / f
  out[0].count += [...groups.values()].filter((g) => g.amount <= 0).reduce((s, g) => s + g.count, 0)
  return out
}

interface ScanForm {
  description: string
  amount: string
  date: string
  category: string
  note: string
  isExpense: boolean
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getErrorMessage(msg: string, L: (ja: string, vi: string, en: string) => string): string {
  if (msg === 'MISSING_API_KEY' || msg.includes('GEMINI_API_KEY')) {
    return L(
      'GEMINI_API_KEY が設定されていません。',
      'Chưa cài GEMINI_API_KEY.',
      'GEMINI_API_KEY is not configured.',
    )
  }
  if (msg === 'QUOTA_EXCEEDED' || msg.includes('QUOTA')) {
    return L(
      '本日の無料枠を使い切りました。',
      'Đã hết hạn ngạch miễn phí hôm nay.',
      'Free quota exhausted for today.',
    )
  }
  return msg
}

// Step indicator
function StepBar({ step, L }: { step: 1 | 2 | 3; L: (ja: string, vi: string, en: string) => string }) {
  const steps = [
    L('画像を選択', 'Chọn ảnh', 'Select Image'),
    L('読み取り', 'Đọc hoá đơn', 'Read receipt'),
    L('確認・保存', 'Xác nhận', 'Confirm & Save'),
  ]
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const done    = step > n
        const current = step === n
        return (
          <div key={n} className="flex items-center gap-1">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
              done    ? 'bg-brand-100 text-brand-700' :
              current ? 'bg-brand-600 text-white' :
                        'bg-[var(--color-surface-default)] border border-[var(--color-border-default)] text-text-muted'
            )}>
              <span className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold',
                done    ? 'bg-brand-600 text-white' :
                current ? 'bg-white text-brand-600' :
                          'bg-border text-text-muted'
              )}>
                {done ? '✓' : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < 2 && <ArrowRight className="w-3 h-3 text-border shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}

const STEP_MAP: Record<ScanState, 1 | 2 | 3> = {
  idle:       1,
  previewing: 1,
  scanning:   2,
  confirming: 3,
  error:      2,
  saved:      3,
}

export default function ScanPage() {
  const { lang }           = useSettingsStore()
  const { t }              = useTranslation()
  const { ledger, accounts, categories: allCategories, members } = useLedgerData()
  const meId = useLedgerStore((s) => s.userId)
  const [accountId, setAccountId] = useState('')
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<EditItem[]>([])
  const [savedCount, setSavedCount] = useState(0)
  // What was just saved, shown on the "saved" screen.
  const [saved, setSaved] = useState<{ ids: string[]; merchant: string; date: string; accountId: string; payer: string; isExpense: boolean; total: number; groups: { categoryId: string; count: number; amount: number }[] } | null>(null)
  // Who the receipt is booked for ("User"); empty = me.
  const [payer, setPayer] = useState('')
  // Lines ticked to give them one category at once.
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const L = (ja: string, vi: string, en: string) =>
    lang === 'ja' ? ja : lang === 'vi' ? vi : en

  const [state,        setState]        = useState<ScanState>('idle')
  const [preview,      setPreview]      = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewZoom,  setPreviewZoom]  = useState(false)
  const [showReceipt,  setShowReceipt]  = useState(false)
  const [scanResult,   setScanResult]   = useState<ScanResult | null>(null)
  const [form,         setForm]         = useState<ScanForm>({
    description: '',
    amount: '',
    date: toLocalISODate(),
    category: '',
    note: '',
    isExpense: true,
  })
  const activeAccounts = accounts.filter((a) => !a.isArchived)
  const categories = allCategories.filter((c) => c.is_active && c.type === (form.isExpense ? 'expense' : 'income'))
  const precision = getCurrencyPrecision(ledger?.currency_code ?? 'JPY')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [errorCode, setErrorCode] = useState('')

  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function setField<K extends keyof ScanForm>(k: K, v: ScanForm[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreview(url)
    setState('previewing')
    setErrorMsg('')
    setErrorCode('')
    setScanResult(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const dt = new DataTransfer()
    dt.items.add(file)
    if (fileRef.current) fileRef.current.files = dt.files
    loadFile(file)
  }

  async function handleScan() {
    const file = selectedFile
    if (!file) return
    setState('scanning')
    setErrorMsg('')
    setErrorCode('')

    try {
      const base64   = await fileToBase64(file)
      const mimeType = file.type || 'image/jpeg'
      const res      = await fetch('/api/scan-receipt', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // The ledger's expense categories, so each line gets a real category id.
        body:    JSON.stringify({
          image: base64, mimeType,
          categories: categoryTreeOptions(allCategories.filter((c) => c.is_active && c.type === 'expense'))
            .map((c) => ({ id: c.id, name: c.name.replace(/^(— )+/, '') })),
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorCode(data.code ?? 'UNKNOWN')
        throw new Error(data.error ?? 'Scan failed')
      }

      const result: ScanResult = data
      const accId = pickAccount(result.paymentMethod, activeAccounts)
      let lines: EditItem[] = (result.items ?? []).map((it) => ({
        key: crypto.randomUUID(),
        name: it.name ?? '',
        quantity: it.quantity || 1,
        amount: String(it.subtotal ?? (it.unitPrice ?? 0) * (it.quantity || 1)),
        categoryId: it.categoryId ?? '',
        source: it.categoryId ? 'ai' : null,
      }))
      let receiptCategory = result.categoryId ?? ''
      // The ledger's own keywords / rules win over the AI's guess.
      if (ledger && accId) {
        const rows = [
          { row_number: 0, type: 'expense', amount: result.totalAmount ?? 0, description: result.storeName ?? '' },
          ...lines.map((it, i) => ({ row_number: i + 1, type: 'expense', amount: num(it.amount), description: it.name })),
        ]
        const { data: matched } = await supabase.rpc('preview_category_rules', { p_ledger_id: ledger.id, p_account_id: accId, p_rows: rows })
        const byRow = new Map((matched ?? []).map((m) => [m.row_number, m.category_id]))
        lines = lines.map((it, i) => (byRow.has(i + 1) ? { ...it, categoryId: byRow.get(i + 1)!, source: 'rule' as const } : it))
        if (byRow.has(0)) receiptCategory = byRow.get(0)!
      }
      // Lines with no category of their own take the receipt's (the
      // "category for unset lines" field), so what is shown is what is saved.
      if (receiptCategory) {
        const src: ItemSource = receiptCategory === result.categoryId ? 'ai' : 'rule'
        lines = lines.map((it) => (it.categoryId ? it : { ...it, categoryId: receiptCategory, source: src }))
      }
      setScanResult(result)
      setAccountId(accId)
      setItems(lines)
      setForm({
        description: result.storeName  ?? '',
        amount:      String(Math.abs(result.totalAmount ?? 0)),
        date:        result.date       ?? toLocalISODate(),
        category:    receiptCategory,
        note:        '',
        isExpense:   true,
      })
      setState('confirming')
    } catch (err: any) {
      setErrorMsg(err.message)
      setState('error')
    }
  }

  // Receipt image → storage (receipts/{ledger_id}/…), then save_receipt: the
  // document + its lines, and one transaction per category of those lines.
  async function handleSave() {
    const amt = num(form.amount)
    const account = accountId || pickAccount(scanResult?.paymentMethod, activeAccounts)
    if (!ledger || !account || !form.description || amt <= 0) return
    setSaving(true)
    try {
      let document: Record<string, unknown> | null = null
      if (selectedFile) {
        const ext = (selectedFile.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${ledger.id}/${crypto.randomUUID()}.${ext}`
        const up = await supabase.storage.from('receipts').upload(path, selectedFile, { contentType: selectedFile.type })
        if (up.error) throw up.error
        document = {
          storage_path: path, file_name: selectedFile.name, mime_type: selectedFile.type || 'image/jpeg', file_size: selectedFile.size,
          ocr_status: scanResult ? 'done' : 'skipped', ocr_provider: scanResult ? 'gemini' : null,
          extracted_merchant: scanResult?.storeName ?? null, extracted_date: scanResult?.date ?? null,
          extracted_total: scanResult?.totalAmount ?? null, extracted_tax: scanResult?.taxAmount ?? null,
          extracted_payment_method: scanResult?.paymentMethod ?? null,
        }
      }
      const lines = items.filter((it) => it.name.trim() || num(it.amount) !== 0)
      const { data, error } = await supabase.rpc('save_receipt', {
        p_ledger_id: ledger.id,
        p_account_id: account,
        p_type: form.isExpense ? 'expense' : 'income',
        p_date: form.date,
        p_merchant: form.description,
        p_total: amt,
        p_notes: form.note || undefined,
        p_fallback_category_id: form.category || undefined,
        p_document: (document ?? undefined) as never,
        p_paid_by: payer || undefined,
        p_items: lines.map((it) => ({
          name: it.name, quantity: it.quantity, amount: num(it.amount),
          unit_price: it.quantity ? num(it.amount) / it.quantity : null,
          category_id: it.categoryId || null, categorized_by: it.categoryId ? it.source ?? 'manual' : null,
        })) as never,
      })
      if (error) throw error
      const ids = (data as { transaction_ids?: string[] } | null)?.transaction_ids ?? []
      setSavedCount(ids.length || 1)
      setSaved({
        ids, merchant: form.description, date: form.date, accountId: account, payer: payer || (meId ?? ''), isExpense: form.isExpense, total: amt,
        groups: split.length ? split.map((g) => ({ categoryId: g.categoryId, count: g.count, amount: g.amount })) : [{ categoryId: form.category, count: 0, amount: amt }],
      })
      useTransactionsStore.setState((st) => ({ revision: st.revision + 1 }))
      setState('saved')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setState('idle')
    setSaved(null)
    setPayer('')
    setPicked(new Set())
    setPreview(null)
    setSelectedFile(null)
    setPreviewZoom(false)
    setShowReceipt(false)
    setScanResult(null)
    setItems([])
    setAccountId('')
    setErrorMsg('')
    setErrorCode('')
    setForm({
      description: '',
      amount: '',
      date: toLocalISODate(),
      category: '',
      note: '',
      isExpense: true,
    })
    if (fileRef.current)   fileRef.current.value   = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  const amtNum = num(form.amount)
  const itemsTotal = items.reduce((sum, it) => sum + num(it.amount), 0)
  const split = splitByCategory(items, amtNum, precision)
  const catName = (id: string) => allCategories.find((c) => c.id === id)?.name ?? t.txform.uncategorized
  const setItem = (key: string, patch: Partial<EditItem>) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  const paymentLabel: Record<string, string> = {
    cash: L('現金', 'Tiền mặt', 'Cash'), credit_card: L('クレジットカード', 'Thẻ tín dụng', 'Credit card'),
    paypay: 'PayPay', rakuten_pay: L('楽天ペイ', 'Rakuten Pay', 'Rakuten Pay'), d_barai: 'd払い', au_pay: 'au PAY', merpay: 'メルペイ',
    ic_card: L('交通系IC', 'Thẻ IC', 'IC card'), e_money: L('電子マネー', 'Tiền điện tử', 'E-money'), other: L('その他', 'Khác', 'Other'),
  }
  const isFormDisabled = !form.description || amtNum <= 0 || activeAccounts.length === 0 || !accountId


  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-3">
        <PageHeader title={t.scan.title} subtitle={t.scan.subtitle} />
        <StepBar step={STEP_MAP[state]} L={L} />
      </div>

      {state === 'saved' && saved && (() => {
        const acc = activeAccounts.find((a) => a.id === saved.accountId) ?? accounts.find((a) => a.id === saved.accountId)
        const who = members.find((m) => m.user_id === saved.payer)
        const sign = saved.isExpense ? '−' : '+'
        return (
          <section className="rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex flex-col items-center text-center px-5 pt-6 pb-5 bg-[linear-gradient(180deg,var(--color-brand-25),var(--color-surface-default))]">
              <span className="w-12 h-12 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></span>
              <p className="mt-3 text-[16px] font-semibold text-[var(--color-text-primary)]">
                {savedCount > 1 ? L(`${savedCount}件の取引を保存しました`, `Đã lưu ${savedCount} giao dịch`, `${savedCount} transactions saved`) : L('取引を保存しました', 'Đã lưu giao dịch', 'Transaction saved')}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[var(--color-text-tertiary)]">{saved.merchant} · {saved.date.split('-').reverse().join('/')}</p>
              <p className={cn('mt-2 text-[28px] font-bold font-tabular tracking-tight', saved.isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]')}>{sign}{formatMoney(saved.total)}</p>
              <div className="mt-2 flex items-center justify-center gap-3 flex-wrap text-[12.5px] text-[var(--color-text-secondary)]">
                {acc && <span className="inline-flex items-center gap-1.5"><AccountBadge account={acc} size={18} />{acc.name}</span>}
                {who && members.length > 1 && <span className="inline-flex items-center gap-1">· {who.user?.display_name ?? who.user?.email}</span>}
              </div>
            </div>
            <ul className="divide-y divide-[var(--color-border-subtle)] border-t border-[var(--color-border-subtle)]">
              {saved.groups.map((g) => {
                const c = allCategories.find((x) => x.id === g.categoryId)
                return (
                  <li key={g.categoryId || 'none'} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                      style={c ? { background: `${c.color}1f`, color: c.color } : { background: 'var(--color-bg-sunken)', color: 'var(--color-text-tertiary)' }}>
                      {c ? <CategoryIcon name={c.emoji} className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-medium text-[var(--color-text-primary)] truncate">{c?.name ?? t.txform.uncategorized}</span>
                      {g.count > 0 && <span className="block text-[11.5px] text-[var(--color-text-tertiary)]">{L(`${g.count}品目`, `${g.count} món`, `${g.count} items`)}</span>}
                    </span>
                    <span className={cn('text-[13.5px] font-semibold font-tabular', saved.isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]')}>{sign}{formatMoney(g.amount)}</span>
                  </li>
                )
              })}
            </ul>
            <div className="grid grid-cols-2 gap-2.5 px-4 sm:px-5 py-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]">
              <Link href={saved.ids[0] ? `/transactions?tx=${saved.ids[0]}` : '/transactions'}>
                <Button variant="outline" className="w-full h-11">{L('取引を見る', 'Xem giao dịch', 'View transactions')}</Button>
              </Link>
              <Button className="w-full h-11" icon={<ScanLine />} onClick={handleReset}>{L('もう一枚', 'Quét hoá đơn khác', 'Scan another')}</Button>
            </div>
          </section>
        )
      })()}

      {state === 'idle' && (
        <>
          {/* Hero in the app's brand style: what this does, and the two ways in. */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="relative overflow-hidden rounded-[18px] p-5 sm:p-6 text-white bg-[linear-gradient(135deg,#047857_0%,#059669_55%,#10b981_100%)] shadow-[var(--shadow-card)]">
            <span aria-hidden className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10" />
            <span aria-hidden className="absolute -left-16 -bottom-20 w-52 h-52 rounded-full bg-black/10" />
            <div className="relative flex items-start gap-3.5">
              <span className="w-11 h-11 rounded-[12px] bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
                <ScanLine className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[17px] font-semibold leading-snug">{L('レシートを撮るだけで取引に', 'Chụp hoá đơn, app tự điền giao dịch', 'Snap a receipt, get a transaction')}</p>
                <p className="text-[13px] text-white/80 mt-1 leading-relaxed">{L('店名・日付・品目を読み取り、カテゴリごとに分けます。', 'Đọc tên cửa hàng, ngày, từng món và tách theo danh mục.', 'Reads the store, date and each line, split by category.')}</p>
              </div>
            </div>
            <div className="relative mt-5 grid grid-cols-2 gap-2.5 [&>input]:hidden">
              <label className="cursor-pointer">
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="sr-only" />
                <span className="flex items-center justify-center gap-2 h-12 rounded-xl bg-white text-[#047857] text-[14px] font-semibold shadow-sm hover:bg-white/90 transition-colors">
                  <Camera className="w-[18px] h-[18px]" />{L('カメラで撮影', 'Chụp ảnh', 'Take photo')}
                </span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 h-12 rounded-xl bg-white/15 ring-1 ring-inset ring-white/30 text-white text-[14px] font-semibold hover:bg-white/20 transition-colors">
                <Upload className="w-[18px] h-[18px]" />{L('写真を選択', 'Chọn ảnh có sẵn', 'Choose photo')}
              </button>
            </div>
            <p className="relative mt-2.5 text-[11.5px] text-white/70 text-center max-sm:hidden">{L('ここに画像をドラッグ&ドロップもできます · JPG · PNG · HEIC', 'Hoặc kéo thả ảnh vào đây · JPG · PNG · HEIC', 'Or drop an image here · JPG · PNG · HEIC')}</p>
          </div>

          {/* How to take a photo the reader gets right the first time. */}
          <section className="rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center gap-3 px-4 sm:px-5 pt-4 pb-3">
              <span className="w-8 h-8 rounded-[10px] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center shrink-0"><Focus className="w-4 h-4" /></span>
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{L('きれいに撮るコツ', 'Mẹo chụp hoá đơn rõ nét', 'Tips for a sharp photo')}</h2>
                <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">{L('鮮明なほど読み取りが正確になります', 'Ảnh càng rõ, app đọc càng đúng', 'The sharper the photo, the better the result')}</p>
              </div>
            </div>
            <ul className="grid sm:grid-cols-2 gap-px bg-[var(--color-border-subtle)] border-t border-[var(--color-border-subtle)]">
              {[
                { icon: Layers, title: L('平らに置く', 'Trải phẳng trên nền tối', 'Lay it flat on a dark surface'), sub: L('折り目を伸ばし、白いレシートは暗い机の上に。', 'Vuốt phẳng nếp gấp; hoá đơn trắng nên đặt trên mặt bàn tối màu.', 'Smooth out folds; put a white receipt on a dark table.') },
                { icon: Smartphone, title: L('真上から撮る', 'Chụp thẳng từ trên xuống', 'Shoot straight from above'), sub: L('スマホを平行に構え、斜めにしない。', 'Giữ điện thoại song song với hoá đơn, không nghiêng.', 'Hold the phone parallel to the receipt, not at an angle.') },
                { icon: Maximize, title: L('全体を枠に入れる', 'Lọt trọn trong khung', 'Fit the whole receipt'), sub: L('店名から「合計」まで写るように。長いレシートは近づいて。', 'Thấy đủ từ tên cửa hàng đến dòng tổng (合計); hoá đơn dài thì đưa máy lại gần.', 'From the store name down to the total (合計); move closer for long ones.') },
                { icon: Sun, title: L('明るく、反射なし', 'Đủ sáng, không loá', 'Bright, no glare'), sub: L('影や光の反射を避け、ピントが合うまで待つ。', 'Tránh bóng tay/điện thoại và đèn chiếu loá; chờ máy lấy nét rồi chụp.', 'Avoid shadows and glare; wait for focus before you shoot.') },
              ].map(({ icon: Icon, title, sub }) => (
                <li key={title} className="flex items-start gap-3 px-4 sm:px-5 py-3 bg-[var(--color-surface-default)]">
                  <span className="w-7 h-7 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] flex items-center justify-center shrink-0 mt-0.5"><Icon className="w-3.5 h-3.5" /></span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</span>
                    <span className="block text-[12px] text-[var(--color-text-tertiary)] leading-relaxed mt-0.5">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-4 px-4 sm:px-5 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] text-[12px]">
              <span className="inline-flex items-center gap-1.5 text-[var(--color-text-gain)] font-medium"><Check className="w-3.5 h-3.5" />{L('平ら・真上・明るい', 'Phẳng · thẳng · sáng', 'Flat · straight · bright')}</span>
              <span className="inline-flex items-center gap-1.5 text-[var(--color-text-loss)] font-medium"><X className="w-3.5 h-3.5" />{L('しわ・斜め・ぼやけ', 'Nhàu · nghiêng · mờ', 'Crumpled · tilted · blurry')}</span>
            </div>
          </section>
        </>
      )}

      {state === 'previewing' && preview && (
        <Card padding="none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              {L('レシートのプレビュー', 'Xem trước hóa đơn', 'Receipt Preview')}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPreviewZoom((v) => !v)}
                icon={previewZoom ? <ZoomOut /> : <ZoomIn />}>
                {previewZoom ? L('縮小', 'Thu nhỏ', 'Shrink') : L('拡大', 'Phóng to', 'Zoom')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw />}>
                {L('選び直す', 'Chọn lại', 'Change')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <img
              src={preview}
              alt="Receipt"
              className={cn(
                'w-full rounded-xl bg-[var(--color-bg-sunken)] object-contain transition-all',
                previewZoom ? 'max-h-[600px]' : 'max-h-64',
              )}
            />
            <p className="mt-3 flex items-start gap-2 text-[12px] text-[var(--color-text-tertiary)] leading-relaxed">
              <Focus className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-text-quaternary)]" />
              {L('文字がはっきり読め、店名から合計まで写っていますか？ ぼやけていれば撮り直してください。', 'Chữ đã rõ và thấy đủ từ tên cửa hàng đến dòng tổng chưa? Nếu ảnh mờ hoặc thiếu, hãy chọn lại.', 'Is the text sharp, from the store name down to the total? If not, retake it.')}
            </p>
            <Button className="w-full mt-4" size="lg" icon={<ScanLine />} onClick={handleScan}>
              {L('読み取る', 'Đọc hoá đơn', 'Read receipt')}
            </Button>
          </CardContent>
        </Card>
      )}

      {state === 'scanning' && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-50)] flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-[var(--brand-600)]" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 border-2 border-[var(--color-interactive-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.scan.scanning}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {L('レシートを読み取っています…', 'Đang đọc hoá đơn…', 'Reading your receipt…')}
              </p>
            </div>
            {preview && (
              <img src={preview} alt="" className="max-h-36 max-w-[180px] rounded-xl object-contain opacity-40" />
            )}
          </div>
        </Card>
      )}

      {state === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border-error)] bg-[var(--color-status-loss-bg)]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-text-loss)]" />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text-loss)]">
                {L('解析に失敗しました', 'Không thể phân tích', 'Analysis failed')}
              </p>
              <p className="text-xs text-[var(--color-text-loss)] opacity-80">
                {getErrorMessage(errorMsg, L)}
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" icon={<ScanLine />} onClick={handleScan}>
                  {L('再試行', 'Thử lại', 'Retry')}
                </Button>
                <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={handleReset}>
                  {L('最初から', 'Bắt đầu lại', 'Start over')}
                </Button>
              </div>
            </div>
            {preview && (
              <img src={preview} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
            )}
          </div>
        </div>
      )}

      {state === 'confirming' && (
        // Receipt + lines on the left, the form on the right (stacked on small screens).
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
          <div className="space-y-4 min-w-0">
          {preview && (
            <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] overflow-hidden">
              <button
                onClick={() => setShowReceipt((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-surface-default)] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <img src={preview} alt="" className="w-8 h-8 rounded-md object-cover border border-[var(--color-border-subtle)]" />
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    {L('元のレシートを表示', 'Xem ảnh hóa đơn gốc', 'Show original receipt')}
                  </span>
                </div>
                {showReceipt
                  ? <ChevronUp className="w-4 h-4 text-[var(--color-text-quaternary)]" />
                  : <ChevronDown className="w-4 h-4 text-[var(--color-text-quaternary)]" />}
              </button>
              {showReceipt && (
                <div className="px-4 pb-4">
                  <img
                    src={preview}
                    alt="Receipt"
                    className={cn(
                      'w-full rounded-xl object-contain transition-all cursor-pointer',
                      previewZoom ? 'max-h-[500px]' : 'max-h-52',
                    )}
                    onClick={() => setPreviewZoom((v) => !v)}
                  />
                  <p className="text-center text-[10px] text-[var(--color-text-quaternary)] mt-1.5">
                    {L('タップして拡大/縮小', 'Nhấn để phóng to/thu nhỏ', 'Tap to zoom')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Receipt lines: each with its own category; saving splits the
              receipt into one transaction per category. */}
          <div className="rounded-xl border border-[var(--color-border-default)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-subtle)]">
              <label className="flex items-center gap-2.5 min-w-0">
                {items.length > 0 && (
                  <input type="checkbox" aria-label={L('すべて選択', 'Chọn tất cả', 'Select all')} className="w-4 h-4 accent-[var(--color-interactive-primary)] shrink-0"
                    checked={picked.size > 0 && picked.size === items.length}
                    ref={(el) => { if (el) el.indeterminate = picked.size > 0 && picked.size < items.length }}
                    onChange={() => setPicked(picked.size === items.length ? new Set() : new Set(items.map((x) => x.key)))} />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-quaternary)] truncate">
                  {L('明細（品目ごとにカテゴリ）', 'Chi tiết từng món', 'Line items')} · {items.length}
                </span>
              </label>
              <button type="button" onClick={() => setItems((list) => [...list, { key: crypto.randomUUID(), name: '', quantity: 1, amount: '', categoryId: form.category, source: form.category ? 'manual' : null }])}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <Plus className="w-3.5 h-3.5" />{L('行を追加', 'Thêm dòng', 'Add line')}
              </button>
            </div>
            {picked.size > 0 && (
              // Several lines → one category in one go.
              <div className="flex items-center gap-2 flex-wrap px-3 py-2.5 bg-[#ecfdf5] border-b border-[#a6f4c5]">
                <span className="text-[12.5px] font-semibold text-[#047857]">{L(`${picked.size}品目を選択`, `Đã chọn ${picked.size} món`, `${picked.size} selected`)}</span>
                <span className="text-[12.5px] text-[#047857]">→</span>
                <CategoryPicker aria-label={L('カテゴリを設定', 'Gán danh mục', 'Set category')} size="sm" className="w-48" categories={categories}
                  placeholder={L('カテゴリを選ぶ', 'Chọn danh mục…', 'Choose category…')} value=""
                  onChange={(v) => { setItems((list) => list.map((it) => (picked.has(it.key) ? { ...it, categoryId: v, source: 'manual' } : it))); setPicked(new Set()) }} />
                <button type="button" onClick={() => setPicked(new Set())} className="ml-auto text-[12px] font-medium text-[#047857] hover:underline">{L('選択解除', 'Bỏ chọn', 'Clear')}</button>
              </div>
            )}
            {items.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[var(--color-text-tertiary)]">
                {L('明細が読み取れませんでした。1件の取引として保存されます。', 'Không đọc được từng món — sẽ lưu thành 1 giao dịch.', 'No line items read — saved as one transaction.')}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {items.map((it) => (
                  <div key={it.key} className={cn('grid grid-cols-[18px_minmax(0,1fr)_104px_28px] sm:grid-cols-[18px_1fr_96px_minmax(0,170px)_28px] items-center gap-2 px-3 py-2', picked.has(it.key) && 'bg-[#f6fef9]')}>
                    <input type="checkbox" aria-label={it.name || L('品目', 'Món', 'Line')} className="w-4 h-4 accent-[var(--color-interactive-primary)]" checked={picked.has(it.key)}
                      onChange={() => setPicked((st) => { const n = new Set(st); if (n.has(it.key)) n.delete(it.key); else n.add(it.key); return n })} />
                    <input aria-label={L('品名', 'Tên món', 'Item')} value={it.name} onChange={(e) => setItem(it.key, { name: e.target.value })}
                      className="min-w-0 h-8 px-2 text-sm rounded-md border border-transparent hover:border-[var(--color-border-default)] focus:border-[var(--color-border-focus)] focus:outline-none bg-transparent" />
                    <AmountInput aria-label={L('金額', 'Số tiền', 'Amount')} currency={ledger?.currency_code ?? 'JPY'} value={it.amount} onChange={(v) => setItem(it.key, { amount: v })}
                      className="h-8 px-2 text-sm text-right font-tabular rounded-md border border-[var(--color-border-default)] focus:border-[var(--color-border-focus)] focus:outline-none bg-[var(--color-surface-default)]" />
                    <CategoryPicker aria-label={L('カテゴリ', 'Danh mục', 'Category')} size="sm" className="max-sm:order-last max-sm:col-start-2 max-sm:col-span-3" categories={categories} noneLabel={t.txform.uncategorized}
                      value={it.categoryId} onChange={(v) => setItem(it.key, { categoryId: v, source: 'manual' })} />
                    <button type="button" aria-label={L('行を削除', 'Xoá dòng', 'Remove line')} onClick={() => setItems((list) => list.filter((x) => x.key !== it.key))}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-quaternary)] hover:text-[var(--color-text-loss)] hover:bg-[var(--color-bg-sunken)]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 && (
              <div className="px-4 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
                  <span>{L('明細の合計', 'Tổng các món', 'Lines total')}: <b className="font-tabular text-[var(--color-text-secondary)]">{formatMoney(itemsTotal)}</b></span>
                  {Math.abs(amtNum - itemsTotal) >= 1 && (
                    <span>{L('差額（税・値引き）', 'Chênh lệch (thuế/giảm giá)', 'Difference (tax/discount)')}: <b className="font-tabular">{amtNum - itemsTotal > 0 ? '+' : ''}{formatMoney(amtNum - itemsTotal)}</b> · {L('比例配分', 'chia theo tỷ lệ', 'spread in proportion')}</span>
                  )}
                </div>
                {split.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-1.5">
                      {split.length > 1
                        ? L(`${split.length}件の取引に分けて保存`, `Sẽ tách thành ${split.length} giao dịch`, `Saved as ${split.length} transactions`)
                        : L('1件の取引として保存', 'Lưu thành 1 giao dịch', 'Saved as 1 transaction')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {split.map((g) => (
                        <span key={g.categoryId || 'none'} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-surface-default)] border border-[var(--color-border-subtle)] text-xs">
                          <span className="font-medium text-[var(--color-text-primary)]">{g.categoryId ? catName(g.categoryId) : t.txform.uncategorized}</span>
                          <span className="text-[var(--color-text-quaternary)]">{g.count}</span>
                          <span className="font-tabular font-semibold">{formatMoney(g.amount)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          </div>

          <Card padding="none" className="lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-text-gain)]" />
                {L('内容を確認・編集', 'Kiểm tra và chỉnh sửa', 'Review & edit')}
              </CardTitle>
              <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={handleReset}>
                {L('やり直し', 'Làm lại', 'Redo')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    label={L('店名・内容', 'Nội dung / Tên cửa hàng', 'Store / Description')}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5">
                    {L('金額', 'Số tiền', 'Amount')}
                  </label>
                  <div className="flex rounded-[var(--radius-md)] border border-[var(--color-border-default)] overflow-hidden">
                    <button
                      onClick={() => setField('isExpense', true)}
                      className={cn(
                        'px-4 py-2.5 text-sm font-semibold transition-colors shrink-0',
                        form.isExpense
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-text-muted hover:bg-red-50 hover:text-red-500',
                      )}
                    >
                      {L('支出', 'Chi tiêu', 'Expense')}
                    </button>
                    <button
                      onClick={() => setField('isExpense', false)}
                      className={cn(
                        'px-4 py-2.5 text-sm font-semibold transition-colors border-l border-[var(--color-border-default)] shrink-0',
                        !form.isExpense
                          ? 'bg-brand-600 text-white'
                          : 'bg-white text-text-muted hover:bg-brand-50 hover:text-brand-600',
                      )}
                    >
                      {L('収入', 'Thu nhập', 'Income')}
                    </button>
                    <AmountInput
                      aria-label={L('金額', 'Số tiền', 'Amount')}
                      currency={ledger?.currency_code ?? 'JPY'}
                      value={form.amount}
                      onChange={(v) => setField('amount', v)}
                      className="flex-1 min-w-0 px-3 text-base font-mono border-l border-[var(--color-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] bg-white"
                      placeholder="0"
                    />
                  </div>
                  <p className={cn(
                    'text-right text-2xl font-bold mt-2 tabular-nums',
                    form.isExpense ? 'text-red-500' : 'text-brand-600',
                  )}>
                    {form.isExpense ? '−' : '+'}{formatMoney(amtNum)}
                  </p>
                </div>

                <Input
                  label={L('日付', 'Ngày', 'Date')}
                  type="date"
                  value={form.date}
                  onChange={(e) => setField('date', e.target.value)}
                />
                <AccountPicker label={t.txform.account} accounts={activeAccounts} value={accountId} onChange={setAccountId} />
                <p className="col-span-2 -mt-1.5 text-[11.5px] text-[var(--color-text-tertiary)]">
                  {scanResult?.paymentMethod && scanResult.paymentMethod !== 'unknown'
                    ? L(`レシートの支払方法: ${paymentLabel[scanResult.paymentMethod] ?? scanResult.paymentMethod}`, `Hoá đơn ghi thanh toán: ${paymentLabel[scanResult.paymentMethod] ?? scanResult.paymentMethod}`, `Paid by (receipt): ${paymentLabel[scanResult.paymentMethod] ?? scanResult.paymentMethod}`)
                    : L('支払方法が不明のため現金を選択', 'Hoá đơn không ghi cách trả — chọn Tiền mặt', 'Payment method not shown — cash selected')}
                </p>
                <div className="col-span-2">
                  <CategoryPicker
                    label={items.length > 0 ? L('共通カテゴリ', 'Danh mục chung', 'Default category') : L('カテゴリ', 'Danh mục', 'Category')}
                    categories={categories}
                    noneLabel={t.txform.uncategorized}
                    value={form.category}
                    onChange={(v) => {
                      const prev = form.category
                      setField('category', v)
                      // Lines still on the old receipt-wide category follow it.
                      setItems((list) => list.map((it) => (!it.categoryId || (it.categoryId === prev && it.source !== 'manual') ? { ...it, categoryId: v } : it)))
                    }}
                  />
                  {items.length > 0 && <p className="mt-1 text-[11.5px] text-[var(--color-text-tertiary)]">{L('カテゴリ未設定の品目に適用されます', 'Áp dụng cho các món chưa chọn danh mục', 'Used for lines without a category')}</p>}
                </div>
                {members.length > 1 && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5">{t.dashboard.users}</label>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.dashboard.users}>
                      {members.map((m) => {
                        const on = (payer || meId) === m.user_id
                        const name = m.user?.display_name ?? m.user?.email?.split('@')[0] ?? '—'
                        return (
                          <button key={m.user_id} type="button" role="radio" aria-checked={on} onClick={() => setPayer(m.user_id === meId ? '' : m.user_id)}
                            className={cn('inline-flex items-center gap-2 h-9 pl-1 pr-3 rounded-full border text-[13px] font-medium transition-colors',
                              on ? 'border-[#a6f4c5] bg-[#ecfdf5] text-[#047857]' : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]')}>
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: m.color ?? '#059669' }}>{getInitials(name)}</span>
                            {name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label={L('メモ（任意）', 'Ghi chú (tùy chọn)', 'Note (optional)')}
                value={form.note}
                onChange={(e) => setField('note', e.target.value)}
                placeholder={L('メモを追加...', 'Thêm ghi chú...', 'Add note...')}
              />

              <Button
                className="w-full"
                size="lg"
                icon={<Save />}
                onClick={handleSave}
                loading={saving}
                disabled={isFormDisabled || saving}
              >
                {split.length > 1
                  ? L(`${split.length}件の取引として保存`, `Lưu ${split.length} giao dịch (tách theo danh mục)`, `Save ${split.length} transactions`)
                  : L('取引を保存する', 'Lưu vào hệ thống', 'Save Transaction')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
