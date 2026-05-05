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
    { value: 'rakuten-pay', label: 'Rakuten Pay', desc: '楽天ペイの利用明細CSV', color: '#BF0000' },
    { value: 'paypay', label: 'PayPay', desc: 'PayPayの取引履歴CSV', color: '#FF0033' },
  ]

function ProviderSelector({
  value,
  onChange,
}: {
  value: PaymentProvider
  onChange: (v: PaymentProvider) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PROVIDER_OPTIONS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            'flex flex-col items-start gap-1 p-4 rounded-[var(--radius-lg)] border-2 text-left transition-all',
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
        'border-2 border-dashed rounded-[var(--radius-lg)] p-10 text-center transition-all cursor-pointer',
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
}: {
  result: ImportResult
  onConfirm: () => void
  onDiscard: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const provider = PROVIDERS.find((p) => p.value === result.provider)
  const totalAmount = result.transactions.reduce((s, t) => s + Math.abs(t.amount), 0)

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
        <Button variant="primary" size="sm" onClick={onConfirm} disabled={result.transactions.length === 0}>
          <CheckCircle2 className="w-4 h-4" />
          {result.transactions.length}件をインポート
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
  const { addTransactions } = useTransactionsStore()

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

  const handleConfirm = (result: ImportResult) => {
    addTransactions(result.transactions)
    setImported((prev) => [...prev, result.fileName])
    setResults((prev) => prev.filter((r) => r.fileName !== result.fileName))
  }

  const handleDiscard = (result: ImportResult) => {
    setResults((prev) => prev.filter((r) => r.fileName !== result.fileName))
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-text-primary">CSVインポート</h1>
        <p className="text-sm text-text-muted mt-0.5">Rakuten Pay・PayPay の明細ファイルを読み込みます</p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. サービスを選択</CardTitle></CardHeader>
        <CardContent>
          <ProviderSelector value={provider} onChange={setProvider} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. ファイルをアップロード</CardTitle></CardHeader>
        <CardContent>
          <DropZone
            onFiles={handleFiles}
            isDragging={isDragging}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
          />
          {loading && (
            <div className="flex items-center gap-2 mt-3 text-sm text-text-secondary">
              <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              解析中...
            </div>
          )}
        </CardContent>
      </Card>

      {imported.length > 0 && (
        <div className="space-y-2">
          {imported.map((name) => (
            <div key={name} className="flex items-center gap-2 px-4 py-3 bg-brand-50 border border-brand-200 rounded-[var(--radius-md)] text-sm">
              <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
              <span className="text-brand-800 font-medium">{name} をインポートしました</span>
              <button onClick={() => setImported((p) => p.filter((n) => n !== name))} className="ml-auto text-brand-400 hover:text-brand-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {results.map((result) => (
        <ImportResultCard
          key={result.fileName}
          result={result}
          onConfirm={() => handleConfirm(result)}
          onDiscard={() => handleDiscard(result)}
        />
      ))}

      <Card className="bg-brand-50 border-brand-100">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <CardTitle className="text-brand-800">明細のダウンロード方法</CardTitle>
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
  )
}
