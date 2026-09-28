'use client'

import { useState, useRef } from 'react'
import {
  Camera, RotateCcw, Save, ScanLine, Image as ImageIcon,
  CheckCircle2, AlertCircle, Key, ZoomIn, ZoomOut,
  Upload, ChevronDown, ChevronUp, ArrowRight, Plus, Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore } from '@/stores/transactions'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import { categoryTreeOptions } from '@/features/categories/types'
import { useLedgerData } from '@/hooks/useLedgerData'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn, toLocalISODate } from '@/lib/utils'
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
    L('AI 解析', 'Phân tích AI', 'AI Scan'),
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
                        'bg-surface-alt text-text-muted'
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
  const { ledger, accounts, categories: allCategories } = useLedgerData()
  const [accountId, setAccountId] = useState('')
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<EditItem[]>([])
  const [savedCount, setSavedCount] = useState(0)

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
        p_items: lines.map((it) => ({
          name: it.name, quantity: it.quantity, amount: num(it.amount),
          unit_price: it.quantity ? num(it.amount) / it.quantity : null,
          category_id: it.categoryId || null, categorized_by: it.categoryId ? it.source ?? 'manual' : null,
        })) as never,
      })
      if (error) throw error
      setSavedCount(((data as { transaction_ids?: string[] } | null)?.transaction_ids ?? []).length || 1)
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

  const catLabels = categoryTreeOptions(categories).map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl mx-auto">
      <div className="flex flex-col gap-3">
        <PageHeader title={t.scan.title} subtitle={t.scan.subtitle} />
        <StepBar step={STEP_MAP[state]} L={L} />
      </div>

      {(state === 'idle' || state === 'saved') && (
        <>
          {state === 'saved' && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-status-gain-bg)] text-sm text-[var(--color-text-gain)]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="font-medium">
                {savedCount > 1
                  ? L(`${savedCount}件の取引を保存しました！`, `Đã lưu ${savedCount} giao dịch (tách theo danh mục)!`, `${savedCount} transactions saved!`)
                  : L('取引を保存しました！', 'Đã lưu giao dịch!', 'Transaction saved!')}
              </span>
              <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto">
                {L('もう一枚', 'Quét thêm', 'Scan another')}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="cursor-pointer group">
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="sr-only"
              />
              <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border bg-white hover:border-brand-400 hover:bg-brand-50 transition-all h-full min-h-[120px]">
                <div className="w-12 h-12 rounded-xl bg-surface-alt group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                  <Camera className="w-6 h-6 text-text-muted group-hover:text-brand-600 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-primary">
                    {L('カメラで撮影', 'Chụp ảnh', 'Take Photo')}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {L('リアカメラで直接撮影', 'Dùng camera thiết bị', 'Use device camera')}
                  </p>
                </div>
              </div>
            </label>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border bg-white hover:border-brand-400 hover:bg-brand-50 transition-all cursor-pointer group min-h-[120px]"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
              <div className="w-12 h-12 rounded-xl bg-surface-alt group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                <Upload className="w-6 h-6 text-text-muted group-hover:text-brand-600 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">
                  {L('ファイルを選択', 'Chọn từ thư viện', 'Upload Image')}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {L('ドラッグ&ドロップも可', 'Kéo thả hoặc chọn file', 'JPG · PNG · HEIC · WEBP')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] p-3.5 flex items-start gap-2.5">
            <ScanLine className="w-4 h-4 text-[var(--color-text-quaternary)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--color-text-quaternary)] leading-relaxed">
              {L(
                'Google Gemini AIがレシートを解析します。鮮明な画像ほど精度が向上します。',
                'Sử dụng Google Gemini AI để đọc hóa đơn. Ảnh rõ nét cho kết quả chính xác hơn.',
                'Google Gemini AI analyzes your receipt. Clearer images yield better accuracy.',
              )}
            </p>
          </div>
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
            <Button className="w-full mt-4" size="lg" icon={<ScanLine />} onClick={handleScan}>
              {L('AI で解析する', 'Phân tích bằng AI', 'Analyze with AI')}
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
                {L('Gemini AI が内容を読み取っています...', 'Gemini AI đang đọc nội dung...', 'Gemini AI is reading the content...')}
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
        <div className="space-y-4">
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
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-quaternary)]">
                {L('明細（品目ごとにカテゴリ）', 'Chi tiết từng món (danh mục riêng)', 'Line items (category each)')} · {items.length}
              </p>
              <button type="button" onClick={() => setItems((list) => [...list, { key: crypto.randomUUID(), name: '', quantity: 1, amount: '', categoryId: form.category, source: form.category ? 'manual' : null }])}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <Plus className="w-3.5 h-3.5" />{L('行を追加', 'Thêm dòng', 'Add line')}
              </button>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[var(--color-text-tertiary)]">
                {L('明細が読み取れませんでした。1件の取引として保存されます。', 'Không đọc được từng món — sẽ lưu thành 1 giao dịch.', 'No line items read — saved as one transaction.')}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {items.map((it) => (
                  <div key={it.key} className="grid grid-cols-[1fr_96px_minmax(0,170px)_28px] items-center gap-2 px-3 py-2">
                    <input aria-label={L('品名', 'Tên món', 'Item')} value={it.name} onChange={(e) => setItem(it.key, { name: e.target.value })}
                      className="min-w-0 h-8 px-2 text-sm rounded-md border border-transparent hover:border-[var(--color-border-default)] focus:border-[var(--color-border-focus)] focus:outline-none bg-transparent" />
                    <input aria-label={L('金額', 'Số tiền', 'Amount')} type="number" value={it.amount} onChange={(e) => setItem(it.key, { amount: e.target.value })}
                      className="h-8 px-2 text-sm text-right font-tabular rounded-md border border-[var(--color-border-default)] focus:border-[var(--color-border-focus)] focus:outline-none bg-[var(--color-surface-default)]" />
                    <select aria-label={L('カテゴリ', 'Danh mục', 'Category')} value={it.categoryId} onChange={(e) => setItem(it.key, { categoryId: e.target.value, source: 'manual' })}
                      className="h-8 px-1.5 text-xs rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-default)] min-w-0">
                      <option value="">{t.txform.uncategorized}</option>
                      {categoryTreeOptions(categories).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
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

          <Card padding="none">
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
                <Input
                  label={L('店名・内容', 'Nội dung / Tên cửa hàng', 'Store / Description')}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className="col-span-2"
                />

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
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setField('amount', e.target.value)}
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
                <Select
                  label={items.length > 0 ? L('カテゴリ（未設定の明細）', 'Danh mục (cho món chưa chọn)', 'Category (unset lines)') : L('カテゴリ', 'Danh mục', 'Category')}
                  value={form.category}
                  onChange={(e) => {
                    const prev = form.category
                    setField('category', e.target.value)
                    // Lines still on the old receipt-wide category follow it.
                    setItems((list) => list.map((it) => (!it.categoryId || (it.categoryId === prev && it.source !== 'manual') ? { ...it, categoryId: e.target.value } : it)))
                  }}
                >
                  <option value="">{t.txform.uncategorized}</option>
                  {catLabels.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </Select>
                <div>
                  <Select label={t.txform.account} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                  <p className="text-[11px] text-[var(--color-text-quaternary)] mt-1">
                    {scanResult?.paymentMethod && scanResult.paymentMethod !== 'unknown'
                      ? L(`レシートの支払方法: ${paymentLabel[scanResult.paymentMethod] ?? scanResult.paymentMethod}`, `Hoá đơn ghi thanh toán: ${paymentLabel[scanResult.paymentMethod] ?? scanResult.paymentMethod}`, `Paid by (receipt): ${paymentLabel[scanResult.paymentMethod] ?? scanResult.paymentMethod}`)
                      : L('支払方法が不明のため現金を選択', 'Hoá đơn không ghi cách trả — chọn Tiền mặt', 'Payment method not shown — cash selected')}
                  </p>
                </div>
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
