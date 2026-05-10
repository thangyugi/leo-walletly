'use client'

import { useState, useRef } from 'react'
import { Camera, RotateCcw, Save, ScanLine, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import type { Category, ReceiptItem } from '@/types'
import { CATEGORIES } from '@/lib/constants'

type ScanState = 'idle' | 'previewing' | 'scanning' | 'confirming' | 'error' | 'saved'

interface ScanResult { storeName: string; totalAmount: number; date: string; category: Category; items?: ReceiptItem[] }
interface FormData   { description: string; amount: string; date: string; category: Category; note: string }

export default function ScanPage() {
  const { addTransaction } = useTransactionsStore()
  const { t, lang }        = useTranslation()
  const { format }         = useMoney()

  const [state,     setState]     = useState<ScanState>('idle')
  const [preview,   setPreview]   = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [form,      setForm]      = useState<FormData>({ description: '', amount: '', date: '', category: 'food', note: '' })
  const [errorMsg,  setErrorMsg]  = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    setState('previewing')
  }

  async function handleScan() {
    if (!fileRef.current?.files?.[0]) return
    setState('scanning')
    setErrorMsg('')
    try {
      const formData = new FormData()
      formData.append('image', fileRef.current.files[0])
      const res  = await fetch('/api/scan-receipt', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Scan failed')
      const result: ScanResult = data
      setScanResult(result)
      setForm({
        description: result.storeName  ?? '',
        amount:      String(Math.abs(result.totalAmount ?? 0)),
        date:        result.date       ?? new Date().toISOString().split('T')[0],
        category:    result.category   ?? 'food',
        note:        '',
      })
      setState('confirming')
    } catch (err: any) {
      setErrorMsg(err.message)
      setState('error')
    }
  }

  function handleSave() {
    const amt = parseFloat(form.amount.replace(/,/g, ''))
    if (!form.description || isNaN(amt)) return
    addTransaction({
      date:        form.date || new Date().toISOString().split('T')[0],
      description: form.description,
      amount:      -Math.abs(amt),
      type:        'payment',
      category:    form.category,
      provider:    'ai-scan',
      note:        form.note || undefined,
    })
    setState('saved')
    setPreview(null)
    setScanResult(null)
  }

  function handleReset() {
    setState('idle')
    setPreview(null)
    setScanResult(null)
    setErrorMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.scan.title} subtitle={t.scan.subtitle} />

      {state === 'saved' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-gain-200)] bg-[var(--color-status-gain-bg)] text-sm text-[var(--color-text-gain)]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t.scan.success}</span>
          <Button variant="ghost" size="xs" onClick={handleReset} className="ml-auto">
            {t.scan.scanAgain}
          </Button>
        </div>
      )}

      {(state === 'idle' || state === 'saved') && (
        <div
          onClick={() => fileRef.current?.click()}
          className="card-base p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[var(--color-border-strong)] transition-all"
        >
          <div className="w-14 h-14 rounded-xl bg-[var(--color-bg-sunken)] flex items-center justify-center mb-4">
            <Camera className="w-7 h-7 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">{t.scan.uploadPrompt}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">{t.scan.fileHint}</p>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
        </div>
      )}

      {state === 'previewing' && preview && (
        <Card padding="none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              {t.scan.previewTitle}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw />}>
                {t.scan.reset}
              </Button>
              <Button size="sm" icon={<ScanLine />} onClick={handleScan}>
                {lang === 'vi' ? 'Quét ngay' : (lang === 'ja' ? '今すぐスキャン' : 'Scan Now')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <img src={preview} alt="Receipt" className="max-h-72 w-full object-contain rounded-lg bg-[var(--color-bg-sunken)]" />
          </CardContent>
        </Card>
      )}

      {state === 'scanning' && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12">
            <span className="animate-spin-slow w-8 h-8 border-2 border-[var(--color-interactive-primary)] border-t-transparent rounded-full" />
            <p className="text-sm text-[var(--color-text-tertiary)]">{t.scan.scanning}</p>
          </div>
        </Card>
      )}

      {state === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border-error)] bg-[var(--color-status-loss-bg)] text-sm text-[var(--color-text-loss)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium mb-0.5">{t.scan.noResult}</p>
            <p className="text-xs">{errorMsg}</p>
          </div>
          <Button variant="ghost" size="xs" onClick={handleReset}><RotateCcw className="w-3.5 h-3.5" /></Button>
        </div>
      )}

      {state === 'confirming' && (
        <Card padding="none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--color-text-gain)]" />
              {t.scan.result}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw />}>
              {t.scan.reset}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t.scan.formStore} value={form.description} onChange={(e) => setField('description', e.target.value)} />
              <Input label={t.scan.formAmount} type="number" value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
              <Input label={t.scan.formDate} type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
              <Select label={t.scan.formCategory} value={form.category} onChange={(e) => setField('category', e.target.value as Category)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </Select>
            </div>
            <Input label={t.scan.formNote} value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder={t.scan.formNoteOpt} />

            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)]">
              <span className="text-xs text-[var(--color-text-tertiary)]">{t.scan.recordedAs}</span>
              <span className="text-sm font-semibold font-tabular text-[var(--color-text-loss)]">
                −{format(parseFloat(form.amount.replace(/,/g, '')) || 0)}
              </span>
            </div>

            <Button className="w-full" icon={<Save />} onClick={handleSave}>
              {t.common.save}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
