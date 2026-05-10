'use client'

import { useState, useRef } from 'react'
import {
  Camera, RotateCcw, Save, ScanLine, Image as ImageIcon,
  CheckCircle2, AlertCircle, Key, ZoomIn, ZoomOut,
  Upload, ChevronDown, ChevronUp, ArrowRight,
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
  const { addTransaction } = useTransactionsStore()
  const { lang }           = useSettingsStore()
  const { t }              = useTranslation()

  const L = (ja: string, vi: string, en: string) =>
    lang === 'ja' ? ja : lang === 'vi' ? vi : en

  const [state,        setState]        = useState<ScanState>('idle')
  const [preview,      setPreview]      = useState<string | null>(null)
  const [previewZoom,  setPreviewZoom]  = useState(false)
  const [showReceipt,  setShowReceipt]  = useState(false)
  const [scanResult,   setScanResult]   = useState<ScanResult | null>(null)
  const [form,         setForm]         = useState<ScanForm>({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'food',
    note: '',
    isExpense: true,
  })
  const [errorMsg,  setErrorMsg]  = useState('')
  const [errorCode, setErrorCode] = useState('')

  // Two separate inputs: gallery (file) and camera
  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function setField<K extends keyof ScanForm>(k: K, v: ScanForm[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
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
    // Prefer camera file, fallback to gallery file
    const file = cameraRef.current?.files?.[0] ?? fileRef.current?.files?.[0]
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
        body:    JSON.stringify({ image: base64, mimeType }),
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
    setShowReceipt(false)
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
    if (fileRef.current)   fileRef.current.value   = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  const amtNum = parseFloat(form.amount.replace(/,/g, '')) || 0

  const catLabels = CATEGORIES.map((c) => ({
    ...c,
    label: lang === 'vi'
      ? ({ food: 'Ăn uống', transport: 'Đi lại', shopping: 'Mua sắm', entertainment: 'Giải trí', health: 'Y tế', utilities: 'Tiện ích', other: 'Khác' } as Record<string, string>)[c.value] ?? c.label
      : lang === 'en'
      ? ({ food: 'Food', transport: 'Transport', shopping: 'Shopping', entertainment: 'Entertainment', health: 'Health', utilities: 'Utilities', other: 'Other' } as Record<string, string>)[c.value] ?? c.label
      : c.label,
  }))

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl mx-auto">
      {/* Header + step bar */}
      <div className="flex flex-col gap-3">
        <PageHeader title={t.scan.title} subtitle={t.scan.subtitle} />
        <StepBar step={STEP_MAP[state]} L={L} />
      </div>

      {/* ── STEP 1: Upload / idle ─────────────────────────────────── */}
      {(state === 'idle' || state === 'saved') && (
        <>
          {state === 'saved' && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-status-gain-bg)] text-sm text-[var(--color-text-gain)]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="font-medium">
                {L('取引を保存しました！', 'Đã lưu giao dịch!', 'Transaction saved!')}
              </span>
              <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto">
                {L('もう一枚', 'Quét thêm', 'Scan another')}
              </Button>
            </div>
          )}

          {/* Two upload entry points */}
          <div className="grid grid-cols-2 gap-3">
            {/* Camera capture */}
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

            {/* File upload / gallery */}
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

          {/* Info */}
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

      {/* ── STEP 1 (cont): Image preview before scan ─────────────── */}
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
            {/* Big prominent scan CTA */}
            <Button className="w-full mt-4" size="lg" icon={<ScanLine />} onClick={handleScan}>
              {L('AI で解析する', 'Phân tích bằng AI', 'Analyze with AI')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Scanning ─────────────────────────────────────── */}
      {state === 'scanning' && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-50)] flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-[var(--color-brand-600)]" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 border-2 border-[var(--color-interactive-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.scan.scanning}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {L('Gemini AI が内容を読み取っています...', 'Gemini AI đang đọc nội dung...', 'Gemini AI is reading the content...')}
              </p>
            </div>
            {/* Still show the image for context */}
            {preview && (
              <img src={preview} alt="" className="max-h-36 max-w-[180px] rounded-xl object-contain opacity-40" />
            )}
          </div>
        </Card>
      )}

      {/* ── STEP 2: Error ────────────────────────────────────────── */}
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

          {(errorCode === 'MISSING_API_KEY' || errorMsg.includes('API_KEY')) && (
            <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-quaternary)]">
                  {L('セットアップガイド', 'Hướng dẫn cài đặt', 'Setup Guide')}
                </p>
              </div>
              {[
                { step: '1', text: L('Google AI Studio (ai.dev) でGemini APIキーを取得', 'Lấy API Key Gemini tại Google AI Studio (ai.dev)', 'Get a Gemini API key from Google AI Studio (ai.dev)') },
                { step: '2', text: L('プロジェクトルートに .env.local を作成', 'Tạo file .env.local ở thư mục gốc dự án', 'Create .env.local in the project root') },
                { step: '3', text: 'GEMINI_API_KEY=your_api_key_here' },
                { step: '4', text: L('開発サーバーを再起動', 'Khởi động lại dev server', 'Restart the dev server') },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-interactive-primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                  <p className={cn('text-xs text-[var(--color-text-secondary)]', step === '3' && 'font-mono bg-[var(--color-surface-default)] px-2 py-1 rounded text-[var(--color-interactive-primary)]')}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Confirming ───────────────────────────────────── */}
      {state === 'confirming' && (
        <div className="space-y-4">
          {/* Receipt thumbnail + toggle */}
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

          {/* Line items from AI */}
          {scanResult?.items && scanResult.items.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border-default)] overflow-hidden">
              <div className="px-4 py-2.5 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-subtle)]">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-quaternary)]">
                  {L('AI が読み取った明細', 'Chi tiết AI đọc được', 'AI-extracted line items')}
                </p>
              </div>
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {scanResult.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.quantity !== 1 && (
                        <span className="text-[10px] font-semibold text-[var(--color-text-quaternary)] bg-[var(--color-bg-sunken)] px-1.5 py-0.5 rounded shrink-0">
                          ×{item.quantity}
                        </span>
                      )}
                      <span className="text-sm text-[var(--color-text-primary)] truncate">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold font-tabular text-[var(--color-text-loss)] shrink-0 ml-3">
                      −{formatMoney(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable confirm form */}
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

                {/* Amount with expense/income toggle */}
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
                  {/* Amount preview */}
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
                  label={L('カテゴリ', 'Danh mục', 'Category')}
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value as Category)}
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

              {/* Save CTA — big and clear */}
              <Button
                className="w-full"
                size="lg"
                icon={<Save />}
                onClick={handleSave}
                disabled={!form.description || amtNum <= 0}
              >
                {L('取引を保存する', 'Lưu vào hệ thống', 'Save Transaction')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
