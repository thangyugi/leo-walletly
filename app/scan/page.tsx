'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Camera, Loader2, CheckCircle2, AlertCircle,
  RotateCcw, Save, Scan, X, Image as ImageIcon, ShoppingBag
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { cn, generateId } from '@/lib/utils'
import { CATEGORIES, CATEGORY_COLORS } from '@/lib/constants'
import type { Category, ReceiptItem, Transaction } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScanResult {
  storeName: string
  totalAmount: number
  date: string
  category: Category
  items?: ReceiptItem[]
}

interface FormData {
  description: string
  amount: string
  date: string
  category: Category
  note: string
}

// ─── State machine ─────────────────────────────────────────────────────────

type ScanState = 'idle' | 'previewing' | 'scanning' | 'confirming' | 'error' | 'saved'

// ─── Step Indicator ───────────────────────────────────────────────────────

function StepBadge({ step, current }: { step: number; current: number }) {
  const done = current > step
  const active = current === step
  return (
    <div className={cn(
      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2',
      done ? 'bg-green-500 border-green-500 text-white' :
      active ? 'bg-brand-600 border-brand-600 text-white' :
      'bg-white border-border text-text-muted'
    )}>
      {done ? '✓' : step}
    </div>
  )
}

// ─── Receipt Card ─────────────────────────────────────────────────────────

function ReceiptPreviewCard({ result }: { result: ScanResult }) {
  const catObj = CATEGORIES.find(c => c.value === result.category)
  const color = CATEGORY_COLORS[result.category] ?? '#94a3b8'
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: color }} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">🤖 AI đã nhận diện</p>
          <h3 className="text-xl font-bold truncate">{result.storeName}</h3>
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${color}30` }}>
          {catObj?.emoji}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-slate-400 text-xs mb-1">Danh mục</p>
          <span className="text-sm font-medium px-2.5 py-1 rounded-full" style={{ background: `${color}40`, color }}>
            {catObj?.emoji} {catObj?.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs mb-1">Tổng tiền</p>
          <p className="text-2xl font-black text-white">¥{result.totalAmount.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

function ReceiptItemTable({ items }: { items: ReceiptItem[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-border flex items-center gap-2">
        <ShoppingBag className="w-3.5 h-3.5 text-brand-600" />
        <span className="text-xs font-bold text-text-primary uppercase tracking-wide">Chi tiết mặt hàng ({items.length} loại)</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, i) => (
          <div key={i} className="flex items-center px-4 py-2.5 gap-3 hover:bg-slate-50 transition-colors">
            <span className="text-xs text-text-muted w-5 shrink-0 font-mono">{i + 1}</span>
            <span className="flex-1 text-sm text-text-primary font-medium min-w-0 truncate">{item.name}</span>
            <div className="flex items-center gap-3 shrink-0 text-right">
              {item.quantity > 1 && (
                <span className="text-xs text-text-muted bg-slate-100 px-1.5 py-0.5 rounded-full">
                  ×{item.quantity}
                </span>
              )}
              {item.quantity > 1 && (
                <span className="text-xs text-text-muted hidden sm:block">@¥{item.unitPrice.toLocaleString()}</span>
              )}
              <span className="text-sm font-bold text-text-primary">¥{item.subtotal.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 px-4 py-2.5 border-t border-border flex justify-between items-center">
        <span className="text-xs font-semibold text-text-muted">Tổng cộng</span>
        <span className="text-sm font-black text-text-primary">
          ¥{items.reduce((s, it) => s + it.subtotal, 0).toLocaleString()}
        </span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ScanPage() {
  const { addTransaction } = useTransactionsStore()
  const { t } = useTranslation()

  const [state, setState] = useState<ScanState>('idle')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg')
  const [imageBase64, setImageBase64] = useState<string>('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [form, setForm] = useState<FormData>({
    description: '', amount: '', date: '', category: 'other', note: ''
  })

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Step: 1=idle/select, 2=previewing, 3=confirm
  const currentStep = state === 'idle' ? 1 : state === 'previewing' || state === 'scanning' ? 2 : 3

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh (JPG, PNG, HEIC...)')
      setState('error')
      return
    }
    setImageMimeType(file.type)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImagePreview(dataUrl)
      // Extract base64 only (strip data:mime;base64, prefix)
      const base64 = dataUrl.split(',')[1]
      setImageBase64(base64)
      setState('previewing')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }, [processFile])

  const handleScan = useCallback(async () => {
    if (!imageBase64) return
    setState('scanning')
    setErrorMsg('')

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, mimeType: imageMimeType }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw Object.assign(new Error(data.error || 'Lỗi máy chủ'), { code: data.code })
      }

      // Validate required fields
      if (!data.totalAmount || !data.storeName) {
        throw Object.assign(new Error('AI không thể đọc được hóa đơn này. Hãy thử ảnh rõ hơn.'), { code: 'PARSE_FAIL' })
      }

      setScanResult(data as ScanResult)
      // Parse items — handle both old string[] and new ReceiptItem[] formats
      const parsedItems: ReceiptItem[] = Array.isArray(data.items)
        ? data.items.filter((it: any) => it && typeof it === 'object' && 'name' in it)
        : []
      setReceiptItems(parsedItems)
      setForm({
        description: data.storeName,
        amount: String(data.totalAmount),
        date: data.date || new Date().toISOString().slice(0, 10),
        category: (data.category as Category) || 'other',
        note: parsedItems.length > 0 ? parsedItems.map(it => it.name).join('、') : '',
      })
      setState('confirming')
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi không xác định')
      setState('error')
    }
  }, [imageBase64, imageMimeType])

  const handleSave = useCallback(() => {
    const amount = parseFloat(form.amount)
    if (!form.description || isNaN(amount) || !form.date) return

    // Serialize receipt items as structured rawData for storage
    const rawData: Record<string, string> = {}
    if (receiptItems.length > 0) {
      rawData['receiptItems'] = JSON.stringify(receiptItems)
      rawData['itemCount'] = String(receiptItems.length)
    }

    const txn: Transaction = {
      id: generateId(),
      date: form.date,
      description: form.description,
      amount: -Math.abs(amount),
      type: 'payment',
      category: form.category,
      provider: 'ai-scan',
      note: form.note || undefined,
      rawData: Object.keys(rawData).length > 0 ? rawData : undefined,
    }
    addTransaction(txn)
    setState('saved')
  }, [form, receiptItems, addTransaction])

  const handleReset = useCallback(() => {
    setState('idle')
    setImagePreview(null)
    setImageBase64('')
    setScanResult(null)
    setReceiptItems([])
    setErrorMsg('')
    setForm({ description: '', amount: '', date: '', category: 'other', note: '' })
  }, [])

  // ─── RENDER: Saved ────────────────────────────────────────────────────────
  if (state === 'saved') {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[70vh] gap-8 animate-in zoom-in duration-500">
        <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center shadow-lg shadow-emerald-100">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Đã lưu thành công!</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Giao dịch từ hóa đơn đã được ghi nhận</p>
          {form.description && (
            <div className="mt-6 inline-flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-3">
              <span className="text-xl">{CATEGORIES.find(c => c.value === form.category)?.emoji}</span>
              <span className="font-black text-emerald-900">{form.description}</span>
              <span className="font-black text-emerald-600 tracking-tighter">−¥{parseFloat(form.amount).toLocaleString()}</span>
            </div>
          )}
        </div>
        <Button onClick={handleReset} className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-black transition-all">
          <Camera className="w-4 h-4 mr-3" />
          Quét hóa đơn tiếp theo
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full p-0 max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-layout-gap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Quét hóa đơn AI</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Công nghệ AI nhận diện tự động từ hình ảnh</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">

      {/* Step Indicators */}
      <div className="flex items-center gap-3">
        {[
          { step: 1, label: 'Chọn ảnh' },
          { step: 2, label: 'AI phân tích' },
          { step: 3, label: 'Xác nhận & Lưu' },
        ].map(({ step, label }, i) => (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <div className={cn('flex-1 h-px w-8', currentStep > i ? 'bg-brand-500' : 'bg-border')} />}
            <div className="flex flex-col items-center gap-1">
              <StepBadge step={step} current={currentStep} />
              <span className={cn('text-[10px] font-semibold', currentStep === step ? 'text-brand-600' : 'text-text-muted')}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Idle — Select image ───────────────────────────────────── */}
      {state === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-layout-gap">
          {/* Camera button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="group flex flex-col items-center gap-6 p-10 rounded-2xl border border-slate-200 bg-white transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 rounded-2xl bg-slate-50 group-hover:bg-slate-900 flex items-center justify-center transition-colors">
              <Camera className="w-10 h-10 text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 tracking-tight">Chụp ảnh</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dùng camera thiết bị</p>
            </div>
          </button>

          {/* Gallery button */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="group flex flex-col items-center gap-6 p-10 rounded-2xl border border-slate-200 bg-white transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 rounded-2xl bg-slate-50 group-hover:bg-slate-900 flex items-center justify-center transition-colors">
              <ImageIcon className="w-10 h-10 text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 tracking-tight">Chọn từ thư viện</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">JPG, PNG, HEIC, WebP</p>
            </div>
          </button>
        </div>
      )}

      {/* ── Step 2: Previewing ────────────────────────────────────────────── */}
      {(state === 'previewing' || state === 'scanning') && imagePreview && (
        <div className="space-y-4">
          <Card className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <img
                src={imagePreview}
                alt="Receipt preview"
                className="w-full max-h-[500px] object-contain bg-slate-50"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="primary" size="md" onClick={handleScan} disabled={state === 'scanning'} className="flex-1">
              {state === 'scanning' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI đang phân tích hóa đơn...
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  Bắt đầu quét bằng AI
                </>
              )}
            </Button>
            <Button variant="secondary" size="md" onClick={handleReset} disabled={state === 'scanning'}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {state === 'scanning' && (
            <div className="flex items-center gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-800">Gemini AI đang phân tích...</p>
                <p className="text-xs text-brand-600 mt-0.5">Đọc hiểu nội dung hóa đơn tiếng Nhật</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Error ─────────────────────────────────────────────────── */}
      {state === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 py-5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">Quét thất bại</p>
              <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
              {errorMsg.includes('GEMINI_API_KEY') || errorMsg.includes('Chưa cấu hình') ? (
                <div className="mt-3 p-3 bg-red-100 rounded-xl text-xs text-red-700">
                  <p className="font-bold mb-1">💡 Cách khắc phục:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Truy cập <strong>aistudio.google.com/app/apikey</strong></li>
                    <li>Tạo API Key miễn phí</li>
                    <li>Mở file <code className="bg-red-200 px-1 rounded">.env.local</code> ở thư mục gốc</li>
                    <li>Thay <code className="bg-red-200 px-1 rounded">your_key_here</code> bằng API Key</li>
                    <li>Khởi động lại: <code className="bg-red-200 px-1 rounded">npm run dev</code></li>
                  </ol>
                </div>
              ) : errorMsg.includes('hết hạn mức') || errorMsg.includes('QUOTA') ? (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <p className="font-bold mb-1">⏳ Hết quota miễn phí tạm thời</p>
                  <ul className="space-y-1">
                    <li>Hệ thống đã thử 3 model khác nhau nhưng đều bị giới hạn.</li>
                    <li>Quota miễn phí thường reset sau <strong>1 phút</strong> hoặc <strong>24 giờ</strong>.</li>
                    <li>Kiểm tra hạn mức tại: <strong>ai.dev/rate-limit</strong></li>
                  </ul>
                </div>
              ) : null}
            </div>
          </CardContent>
          <div className="px-5 pb-4">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              Thử lại
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 3: Confirming ────────────────────────────────────────────── */}
      {state === 'confirming' && scanResult && (
        <div className="space-y-5">
          {/* AI result card */}
          <ReceiptPreviewCard result={scanResult} />

          {/* Receipt items detail table */}
          {receiptItems.length > 0 && <ReceiptItemTable items={receiptItems} />}

          {/* Edit form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-text-secondary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Kiểm tra & Chỉnh sửa trước khi lưu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">
                  Tên cửa hàng / Mô tả
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full h-10 px-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Amount + Date side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">
                    Số tiền (¥)
                  </label>
                  <input
                    type="text"
                    value={form.amount ? Number(form.amount).toLocaleString() : ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '')
                      setForm(f => ({ ...f, amount: val }))
                    }}
                    className="w-full h-10 px-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">
                    Ngày
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full h-10 px-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">
                  Danh mục
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                        form.category === cat.value
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-border bg-white text-text-muted hover:border-brand-300'
                      )}
                    >
                      <span className="text-base">{cat.emoji}</span>
                      <span className="truncate w-full text-center text-[10px]">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">
                  Ghi chú (tùy chọn)
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Các mặt hàng đã mua..."
                  className="w-full h-10 px-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-text-muted"
                />
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-border">
                <span className="text-sm text-text-muted">Sẽ lưu khoản chi tiêu</span>
                <span className="text-lg font-black text-red-500">
                  −¥{parseFloat(form.amount || '0').toLocaleString()}
                </span>
              </div>

              <div className="flex gap-3">
                <Button variant="primary" size="md" onClick={handleSave} className="flex-1"
                  disabled={!form.description || !form.amount || !form.date}>
                  <Save className="w-4 h-4" />
                  Lưu giao dịch
                </Button>
                <Button variant="ghost" size="md" onClick={handleReset}>
                  <X className="w-4 h-4" />
                  Hủy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Help card */}
      {state === 'idle' && (
        <Card className="bg-gradient-to-br from-brand-50 to-purple-50 border-brand-100">
          <CardHeader>
            <CardTitle className="text-sm text-brand-800 flex items-center gap-2">
              💡 Mẹo để AI đọc chính xác nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-brand-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">📸</span>
                <span>Chụp ảnh <strong>thẳng góc, đủ sáng</strong>, không bị bóng che</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">🔍</span>
                <span>Đảm bảo <strong>toàn bộ hóa đơn</strong> nằm trong khung ảnh</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">✅</span>
                <span>AI sẽ điền form tự động — bạn chỉ cần <strong>kiểm tra và nhấn Lưu</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">🆓</span>
                <span>Hệ thống AI thông minh — Phân tích hóa đơn nhanh chóng</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  )
}
