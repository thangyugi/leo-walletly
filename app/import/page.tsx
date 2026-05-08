'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTransactionsStore } from '@/stores/transactions'
import { parseFile } from '@/features/import/parsers'
import { formatCurrency, formatDate, getCategoryLabel, cn } from '@/lib/utils'
import { PROVIDERS, CATEGORY_COLORS } from '@/lib/constants'
import type { ImportResult, PaymentProvider, Transaction } from '@/types'

const PROVIDER_OPTIONS: { value: PaymentProvider; label: string; desc: string; color: string }[] =
  [
    { value: 'rakuten-pay', label: 'Rakuten Pay', desc: '楽天カード明細 CSV / PDF', color: '#BF0000' },
    { value: 'paypay', label: 'PayPay（残高）', desc: 'PayPay取引履歴 CSV / PDF', color: '#FF0033' },
    { value: 'paypay-card', label: 'PayPayカード', desc: 'PayPayクレジット明細 CSV', color: '#8B1AFF' },
  ]

function ProviderSelector({
  value,
  onChange,
}: {
  value: PaymentProvider
  onChange: (v: PaymentProvider) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {PROVIDER_OPTIONS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            'flex flex-col items-start gap-1 p-4 rounded-2xl border-2 text-left transition-all',
            value === p.value
              ? 'border-brand-600 bg-brand-50'
              : 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/30'
          )}
        >
          <div className="flex items-center gap-2 w-full">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="font-semibold text-sm text-text-primary">{p.label}</span>
            {value === p.value && <CheckCircle2 className="w-4 h-4 text-brand-600 ml-auto" />}
          </div>
          <span className="text-xs text-text-muted">{p.desc}</span>
        </button>
      ))}
    </div>
  )
}

function DropZone({
  onFiles,
  isDragging,
  onDragOver,
  onDragLeave,
}: {
  onFiles: (files: FileList) => void
  isDragging: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
        isDragging
          ? 'border-brand-500 bg-brand-50'
          : 'border-border hover:border-brand-400 hover:bg-brand-50/30 bg-surface'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-3">
        <div className={cn('w-14 h-14 rounded-full flex items-center justify-center transition-colors', isDragging ? 'bg-brand-100' : 'bg-surface-alt')}>
          <Upload className={cn('w-6 h-6', isDragging ? 'text-brand-600' : 'text-text-muted')} />
        </div>
        <div>
          <p className="font-medium text-text-primary text-sm">ファイルをドラッグ＆ドロップ</p>
          <p className="text-xs text-text-muted mt-1">または クリックしてファイルを選択</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="neutral">PDF</Badge>
          <Badge variant="neutral">CSV</Badge>
        </div>
      </div>
    </div>
  )
}

function TransactionPreviewRow({ txn }: { txn: Transaction }) {
  const isExpense = txn.amount < 0
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 text-sm">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: `${CATEGORY_COLORS[txn.category]}20`, color: CATEGORY_COLORS[txn.category] }}
      >
        {txn.description.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">{txn.description}</p>
        <p className="text-xs text-text-muted">{formatDate(txn.date)} · {getCategoryLabel(txn.category)}</p>
      </div>
      <p className={cn('font-semibold shrink-0', isExpense ? 'text-red-500' : 'text-brand-600')}>
        {isExpense ? '' : '+'}
        {formatCurrency(txn.amount)}
      </p>
    </div>
  )
}

function ImportResultCard({
  result,
  onConfirm,
  onDiscard,
  existingTransactions,
}: {
  result: ImportResult
  onConfirm: (newOnly: Transaction[]) => void
  onDiscard: () => void
  existingTransactions: Transaction[]
}) {
  const [expanded, setExpanded] = useState(true)
  const [skipDupes, setSkipDupes] = useState(true)
  const provider = PROVIDERS.find((p) => p.value === result.provider)
  const totalAmount = result.transactions.reduce((s, t) => s + Math.abs(t.amount), 0)

  // Detect duplicates: same date + same amount + same description (trimmed)
  const existingKeys = new Set(
    existingTransactions.map(t => `${t.date}|${t.amount}|${t.description.trim().toLowerCase()}`)
  )
  const duplicates = result.transactions.filter(t =>
    existingKeys.has(`${t.date}|${t.amount}|${t.description.trim().toLowerCase()}`)
  )
  const newTransactions = result.transactions.filter(t =>
    !existingKeys.has(`${t.date}|${t.amount}|${t.description.trim().toLowerCase()}`)
  )
  const hasDupes = duplicates.length > 0
  const toImport = skipDupes ? newTransactions : result.transactions

  return (
    <Card className={cn(result.transactions.length === 0 ? 'border-red-200' : '')}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {result.transactions.length > 0 ? (
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          {result.fileName.toLowerCase().endsWith('.pdf') ? (
            <FileText className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-green-500 shrink-0" />
          )}
          <CardTitle className="flex-1 truncate">{result.fileName}</CardTitle>
          <Badge variant={result.transactions.length > 0 ? 'default' : 'danger'}>
            {provider?.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {result.transactions.length}件 · {formatCurrency(totalAmount)}
          </span>
          <button onClick={() => setExpanded(!expanded)} className="text-text-muted hover:text-text-primary">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>

      {/* Duplicate warning */}
      {hasDupes && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-800">
                Phát hiện {duplicates.length} giao dịch trùng lặp
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Các giao dịch này đã có trong hệ thống (cùng ngày, số tiền, mô tả)
              </p>
              <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                {duplicates.slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-100/60 rounded px-2 py-1">
                    <span className="font-mono">{t.date}</span>
                    <span className="flex-1 truncate">{t.description}</span>
                    <span className="font-bold shrink-0">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                {duplicates.length > 5 && (
                  <p className="text-[10px] text-amber-500 text-center">... và {duplicates.length - 5} giao dịch khác</p>
                )}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => setSkipDupes(v => !v)}
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors shrink-0',
                    skipDupes ? 'bg-brand-600' : 'bg-slate-300'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    skipDupes ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </button>
                <span className="text-xs text-amber-800 font-medium">
                  {skipDupes ? `Bỏ qua trùng lặp — chỉ nhập ${newTransactions.length} giao dịch mới` : `Nhập tất cả (kể cả trùng lặp)`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">{result.errors.length}件の警告</p>
          <ul className="text-xs text-amber-600 space-y-0.5">
            {result.errors.slice(0, 3).map((e, i) => <li key={i}>· {e}</li>)}
            {result.errors.length > 3 && <li className="text-amber-400">… 他{result.errors.length - 3}件</li>}
          </ul>
        </div>
      )}

      {expanded && result.transactions.length > 0 && (
        <CardContent>
          <div className="max-h-64 overflow-y-auto">
            {result.transactions.slice(0, 20).map((txn) => (
              <TransactionPreviewRow key={txn.id} txn={txn} />
            ))}
            {result.transactions.length > 20 && (
              <p className="text-xs text-text-muted text-center pt-3">他 {result.transactions.length - 20} 件</p>
            )}
          </div>
        </CardContent>
      )}

      <div className="flex gap-2 mt-4">
        <Button variant="primary" size="sm" onClick={() => onConfirm(toImport)} disabled={toImport.length === 0}>
          <CheckCircle2 className="w-4 h-4" />
          {toImport.length}件をインポート
        </Button>
        <Button variant="ghost" size="sm" onClick={onDiscard}>
          <X className="w-4 h-4" />
          破棄
        </Button>
      </div>
    </Card>
  )
}

export default function ImportPage() {
  const [provider, setProvider] = useState<PaymentProvider>('rakuten-pay')
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [imported, setImported] = useState<string[]>([])
  const { addTransactions, transactions: existingTransactions } = useTransactionsStore()

  const handleFiles = useCallback(
    async (files: FileList) => {
      setLoading(true)
      const parsed: ImportResult[] = []
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (ext !== 'csv' && ext !== 'pdf') continue
        const result = await parseFile(file, provider)
        parsed.push(result)
      }
      setResults((prev) => [...prev, ...parsed])
      setLoading(false)
    },
    [provider]
  )

  const handleConfirm = (newTxns: Transaction[]) => {
    if (newTxns.length === 0) return
    addTransactions(newTxns)
    setImported((prev) => [...prev, results.find(r => r.transactions.some(t => newTxns.includes(t)))?.fileName ?? ''])
    setResults((prev) => prev.filter((r) => !r.transactions.some(t => newTxns.includes(t))))
  }

  const handleDiscard = (result: ImportResult) => {
    setResults((prev) => prev.filter((r) => r.fileName !== result.fileName))
  }

  return (
    <div className="w-full p-0 max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-layout-gap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Nhập dữ liệu</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Đồng bộ hóa từ CSV/PDF của Rakuten Pay & PayPay</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">

      <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden bg-white">
        <CardHeader className="pb-4"><CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Chọn dịch vụ</CardTitle></CardHeader>
        <CardContent>
          <ProviderSelector value={provider} onChange={setProvider} />
        </CardContent>
      </Card>

      <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden bg-white">
        <CardHeader className="pb-4"><CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Tải tệp lên</CardTitle></CardHeader>
        <CardContent>
          <DropZone
            onFiles={handleFiles}
            isDragging={isDragging}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
          />
          {loading && (
            <div className="flex items-center gap-3 mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              Đang phân tích dữ liệu...
            </div>
          )}
        </CardContent>
      </Card>

      {imported.length > 0 && (
        <div className="space-y-3">
          {imported.map((name) => (
            <div key={name} className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm animate-in slide-in-from-top-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-emerald-900 font-bold text-sm">Đã nhập thành công: {name}</span>
              <button onClick={() => setImported((p) => p.filter((n) => n !== name))} className="ml-auto text-emerald-300 hover:text-emerald-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {results.map((result) => (
        <ImportResultCard
          key={result.fileName}
          result={result}
          existingTransactions={existingTransactions}
          onConfirm={(newTxns) => {
            addTransactions(newTxns)
            setImported(prev => [...prev, result.fileName])
            setResults(prev => prev.filter(r => r.fileName !== result.fileName))
          }}
          onDiscard={() => handleDiscard(result)}
        />
      ))}

      <Card className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm opacity-80 hover:opacity-100 transition-opacity">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FileText className="w-4 h-4 text-slate-900" />
            </div>
            <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Hướng dẫn tải tệp</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-brand-900">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">Rakuten Card（楽天カード）</p>
                <div className="flex gap-1">
                  <Badge variant="default" className="text-[10px] py-0 px-1.5">PDF</Badge>
                  <Badge variant="neutral" className="text-[10px] py-0 px-1.5">CSV</Badge>
                </div>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-xs text-brand-700">
                <li>楽天e-NAVIにログイン</li>
                <li>「ご利用明細」→「明細PDF」ダウンロード</li>
                <li>またはCSV形式も選択可能</li>
              </ol>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">PayPay</p>
                <div className="flex gap-1">
                  <Badge variant="default" className="text-[10px] py-0 px-1.5">PDF</Badge>
                  <Badge variant="neutral" className="text-[10px] py-0 px-1.5">CSV</Badge>
                </div>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-xs text-brand-700">
                <li>PayPayアプリ → 残高・履歴</li>
                <li>「取引履歴」→ 右上のメニュー</li>
                <li>「PDFでダウンロード」または「CSVでダウンロード」</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
