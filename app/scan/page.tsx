'use client'

import { useState, useRef } from 'react'
import {
  Camera, RotateCcw, Save, ScanLine, Image as ImageIcon,
  CheckCircle2, AlertCircle, Key, ZoomIn, ZoomOut, Info,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore } from '@/stores/transactions'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import { generateId, cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'
import { formatMoney } from '@/lib/money'
import type { Category, ReceiptItem } from '@/types'

type ScanState = 'idle' | 'previewing' | 'scanning' | 'confirming' | 'error' | 'saved'

interface ScanResult {
  storeName: string
  totalAmount: number
  date: string
  category: Category
  items?: ReceiptItem[]
}

interface ScanForm {
  description: string
  amount: string
  date: string
  category: Category
  note: string
  isExpense: boolean
}

// Convert File to base64 string (strips the data URL prefix)
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => {
      const result = reader.result as string
      // Remove "data:image/jpeg;base64," prefix — API needs raw base64
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Error code → human-readable i18n message
function getErrorMessage(
  msg: string,
  L: (ja: string, vi: string, en: string) => string
): string {
  if (msg === 'MISSING_API_KEY' || msg.includes('GEMINI_API_KEY')) {
    return L(
      'GEMINI_API_KEY が設定されていません。環境変数を確認してください。',
      'Chưa cài GEMINI_API_KEY. Vui lòng kiểm tra biến môi trường.',
      'GEMINI_API_KEY is not configured. Please check your environment variables.',
    )
  }
  if (msg === 'QUOTA_EXCEEDED' || msg.includes('QUOTA')) {
    return L(
      '本日の無料枠を使い切りました。しばらく経ってから再試行してください。',
      'Đã hết hạn ngạch miễn phí hôm nay. Vui lòng thử lại sau vài phút.',
      'Free quota exhausted for today. Please try again in a few minutes.',
    )
  }
  return msg
}

export default function ScanPage() {
  const { addTransaction } = useTransactionsStore()
  const { lang }           = useSettingsStore()
  const { t }              = useTranslation()

  const L = (ja: string, vi: string, en: string) =>
    lang === 'ja' ? ja : lang === 'vi' ? vi : en

  const [state,     setState]     = useState<ScanState>('idle')
  const [preview,   setPreview]   = useState<string | null>(null)
  const [previewZoom, setPreviewZoom] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [form,      setForm]      = useState<ScanForm>({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'food',
    note: '',
    isExpense: true,
  })
  const [errorMsg,  setErrorMsg]  = useState('')
  const [errorCode, setErrorCode] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function setField<K extends keyof ScanForm>(k: K, v: ScanForm[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    setState('previewing')
    setErrorMsg('')
    setErrorCode('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    // Store the file on the input ref
    const dt = new DataTransfer()
    dt.items.add(file)
    if (fileRef.current) fileRef.current.files = dt.files
    setState('previewing')
    setErrorMsg('')
    setErrorCode('')
  }

  async function handleScan() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setState('scanning')
    setErrorMsg('')
    setErrorCode('')

    try {
      // Convert file → base64 (the API expects JSON with base64, not FormData)
      const base64  = await fileToBase64(file)
      const mimeType = file.type || 'image/jpeg'

      const res  = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorCode(data.code ?? 'UNKNOWN')
        throw new Error(data.error ?? 'Scan failed')
      }

      const result: ScanResult = data
      setScanResult(result)
      setForm({
        description: result.storeName  ?? '',
        amount:      String(Math.abs(result.totalAmount ?? 0)),
        date:        result.date       ?? new Date().toISOString().split('T')[0],
        category:    result.category   ?? 'other',
        note:        '',
        isExpense:   true,
      })
      setState('confirming')
    } catch (err: any) {
      setErrorMsg(err.message)
      setState('error')
    }
  }

  function handleSave() {
    const amt = parseFloat(form.amount.replace(/,/g, ''))
    if (!form.description || isNaN(amt) || amt <= 0) return
    const finalAmount = form.isExpense ? -Math.abs(amt) : Math.abs(amt)
    addTransaction({
      date:        form.date || new Date().toISOString().split('T')[0],
      description: form.description,
      amount:      finalAmount,
      type:        form.isExpense ? 'payment' : 'income',
      category:    form.category,
      provider:    'ai-scan',
      note:        form.note || undefined,
    })
    setState('saved')
  }

  function handleReset() {
    setState('idle')
    setPreview(null)
    setPreviewZoom(false)
    setScanResult(null)
    setErrorMsg('')
    setErrorCode('')
    setForm({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'food',
      note: '',
      isExpense: true,
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  const amtNum = parseFloat(form.amount.replace(/,/g, '')) || 0

  // Category labels for current lang
  const catLabels = CATEGORIES.map((c) => ({
    ...c,
    label: lang === 'ja' ? c.label : lang === 'vi'
      ? ({ food: 'Ăn uống', transport: 'Đi lại', shopping: 'Mua sắm', entertainment: 'Giải trí', health: 'Y tế', utilities: 'Tiện ích', other: 'Khác' }[c.value])
      : ({ food: 'Food', transport: 'Transport', shopping: 'Shopping', entertainment: 'Entertainment', health: 'Health', utilities: 'Utilities', other: 'Other' }[c.value]),
  }))

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl mx-auto">
      <PageHeader title={t.scan.title} subtitle={t.scan.subtitle} />

      {/* Saved success */}
      {state === 'saved' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-status-gain-bg)] text-sm text-[var(--color-text-gain)]">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-medium">
            {L('取引を保存しました！', 'Đã lưu giao dịch!', 'Transaction saved!')}
          </span>
          <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto text-[var(--color-text-gain)]">
            {L('もう一枚', 'Quét thêm', 'Scan another')}
          </Button>
        </div>
      )}

      {/* Upload zone */}
      {(state === 'idle' || state === 'saved') && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="card-base p-16 flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)] transition-all group"
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-sunken)] group-hover:bg-[var(--color-brand-50)] flex items-center justify-center mb-5 transition-colors">
            <Camera className="w-8 h-8 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-brand-600)] transition-colors" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{t.scan.uploadPrompt}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-1">
            {L('ドラッグ&ドロップ、またはクリックして選択', 'Kéo thả hoặc nhấn để chọn ảnh', 'Drag & drop or click to select')}
          </p>
          <p className="text-xs text-[var(--color-text-quaternary)]">JPG · PNG · HEIC · WEBP · 最大 10 MB</p>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
        </div>
      )}

      {/* Preview + scan button */}
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
                {previewZoom
                  ? L('縮小', 'Thu nhỏ', 'Shrink')
                  : L('拡大', 'Phóng to', 'Zoom')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw />}>
                {L('リセット', 'Làm lại', 'Reset')}
              </Button>
              <Button size="sm" icon={<ScanLine />} onClick={handleScan}>
                {L('AI で解析', 'Phân tích AI', 'Analyze with AI')}
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
          </CardContent>
        </Card>
      )}

      {/* Scanning state */}
      {state === 'scanning' && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-50)] flex items-center justify-center">
                <ScanLine className="w-7 h-7 text-[var(--color-brand-600)]" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 border-2 border-[var(--color-interactive-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.scan.scanning}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                {L('Gemini AI が解析しています', 'Gemini AI đang phân tích', 'Gemini AI is analyzing')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border-error)] bg-[var(--color-status-loss-bg)]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-text-loss)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-loss)] mb-1">{t.scan.noResult}</p>
              <p className="text-xs text-[var(--color-text-loss)] opacity-80">
                {getErrorMessage(errorMsg, L)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}
              className="text-[var(--color-text-loss)] shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Setup guide for missing API key */}
          {(errorCode === 'MISSING_API_KEY' || errorMsg.includes('API_KEY')) && (
            <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-quaternary)]">
                  {L('セットアップガイド', 'Hướng dẫn cài đặt', 'Setup Guide')}
                </p>
              </div>
              {[
                {
                  step: '1',
                  text: L(
                    'Google AI Studio (ai.dev) でGemini APIキーを取得',
                    'Lấy API Key Gemini tại Google AI Studio (ai.dev)',
                    'Get a Gemini API key from Google AI Studio (ai.dev)',
                  ),
                },
                {
                  step: '2',
                  text: L(
                    'プロジェクトルートに .env.local ファイルを作成',
                    'Tạo file .env.local ở thư mục gốc dự án',
                    'Create a .env.local file in the project root',
                  ),
                },
                {
                  step: '3',
                  text: 'GEMINI_API_KEY=your_api_key_here',
                },
                {
                  step: '4',
                  text: L(
                    '開発サーバーを再起動して再試行',
                    'Khởi động lại dev server và thử lại',
                    'Restart the dev server and try again',
                  ),
                },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-interactive-primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {step}
                  </span>
                  <p className={cn(
                    'text-xs text-[var(--color-text-secondary)]',
                    step === '3' && 'font-mono bg-[var(--color-surface-default)] px-2 py-1 rounded-md text-[var(--color-interactive-primary)]',
                  )}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirming form */}
      {state === 'confirming' && (
        <Card padding="none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--color-text-gain)]" />
              {t.scan.result}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw />}>
              {L('やり直し', 'Làm lại', 'Redo')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Line items summary */}
            {scanResult?.items && scanResult.items.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-2">
                  {L('明細', 'Chi tiết sản phẩm', 'Line Items')}
                </p>
                <div className="rounded-xl border border-[var(--color-border-default)] overflow-hidden divide-y divide-[var(--color-border-subtle)]">
                  {scanResult.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.quantity !== 1 && (
                          <span className="text-[10px] font-semibold text-[var(--color-text-quaternary)] bg-[var(--color-bg-sunken)] px-1.5 py-0.5 rounded-md shrink-0">
                            ×{item.quantity}
                          </span>
                        )}
                        <span className="text-xs text-[var(--color-text-primary)] truncate">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold font-tabular text-[var(--color-text-loss)] shrink-0 ml-2">
                        −{formatMoney(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={L('店名・内容', 'Nội dung', 'Store / Description')}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                className="col-span-2"
              />
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5">
                  {L('金額', 'Số tiền', 'Amount')}
                </label>
                <div className="flex rounded-[var(--radius-md)] border border-[var(--color-border-default)] overflow-hidden">
                  <button
                    onClick={() => setField('isExpense', true)}
                    className={cn(
                      'px-3 py-2 text-xs font-semibold transition-colors',
                      form.isExpense
                        ? 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]'
                        : 'bg-[var(--color-surface-default)] text-[var(--color-text-quaternary)] hover:bg-[var(--color-bg-sunken)]',
                    )}
                  >
                    {L('支出', 'Chi', '−')}
                  </button>
                  <button
                    onClick={() => setField('isExpense', false)}
                    className={cn(
                      'px-3 py-2 text-xs font-semibold transition-colors border-l border-[var(--color-border-default)]',
                      !form.isExpense
                        ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]'
                        : 'bg-[var(--color-surface-default)] text-[var(--color-text-quaternary)] hover:bg-[var(--color-bg-sunken)]',
                    )}
                  >
                    {L('収入', 'Thu', '+')}
                  </button>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setField('amount', e.target.value)}
                    className="flex-1 min-w-0 px-3 text-sm font-mono border-l border-[var(--color-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] bg-[var(--color-surface-default)]"
                    placeholder="0"
                  />
                </div>
              </div>
              <Input
                label={L('日付', 'Ngày', 'Date')}
                type="date"
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
              />
              <Select
                label={L('カテゴリ', 'Danh mục', 'Category')}
                value={form.category}
                onChange={(e) => setField('category', e.target.value as Category)}
                className="col-span-2"
              >
                {catLabels.map((c) => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </Select>
            </div>
            <Input
              label={L('メモ（任意）', 'Ghi chú (tùy chọn)', 'Note (optional)')}
              value={form.note}
              onChange={(e) => setField('note', e.target.value)}
              placeholder={L('メモを追加...', 'Thêm ghi chú...', 'Add note...')}
            />

            {/* Amount preview */}
            <div className={cn(
              'flex items-center justify-between p-3 rounded-xl border',
              form.isExpense
                ? 'bg-[var(--color-status-loss-bg)] border-[var(--color-border-subtle)]'
                : 'bg-[var(--color-status-gain-bg)] border-[var(--color-border-subtle)]',
            )}>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {L('記録内容', 'Sẽ ghi nhận', 'Will record as')}
              </span>
              <span className={cn(
                'text-lg font-bold font-tabular',
                form.isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]',
              )}>
                {form.isExpense ? '−' : '+'}{formatMoney(amtNum)}
              </span>
            </div>

            <Button
              className="w-full"
              icon={<Save />}
              onClick={handleSave}
              disabled={!form.description || amtNum <= 0}
            >
              {L('保存する', 'Lưu giao dịch', 'Save Transaction')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      {(state === 'idle' || state === 'saved') && (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] p-4">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[var(--color-text-quaternary)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                {L('AI読取について', 'Về tính năng quét AI', 'About AI Scanning')}
              </p>
              <p className="text-[11px] text-[var(--color-text-quaternary)] leading-relaxed">
                {L(
                  'Google Gemini AIがレシートを解析します。GEMINI_API_KEYの設定が必要です。精度は画像の品質と文字の鮮明さに依存します。',
                  'Sử dụng Google Gemini AI để phân tích hóa đơn. Cần cài đặt GEMINI_API_KEY. Độ chính xác phụ thuộc vào chất lượng ảnh.',
                  'Uses Google Gemini AI to analyze receipts. Requires GEMINI_API_KEY. Accuracy depends on image quality and text clarity.',
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
