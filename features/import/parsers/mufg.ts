import Papa from 'papaparse'
import type { LegacyTransaction as Transaction, TransactionType } from '@/types'
import { generateId, normalizeDate } from '@/lib/utils'

// 三菱UFJ銀行 (MUFG) CSV
// Columns: 日付 | 摘要 | 摘要内容 | 支払い金額 | 預かり金額 | 差引残高

const DATE_KEYS   = ['日付', '取引日', '取引年月日']
const DESC_KEYS   = ['摘要内容', '摘要', '内容']
const DEBIT_KEYS  = ['支払い金額', '支払金額', '出金金額']
const CREDIT_KEYS = ['預かり金額', '預入金額', '入金金額']

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) if (row[k] !== undefined) return row[k].trim()
  return ''
}

function parseYen(s: string): number | null {
  const n = parseFloat(s.replace(/[¥,，￥\s円]/g, ''))
  return isNaN(n) ? null : n
}

export function parseMUFGCSV(text: string): { transactions: Transaction[]; errors: string[] } {
  const errors: string[] = []
  const transactions: Transaction[] = []

  const lines = text.split('\n')
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (DATE_KEYS.some((k) => lines[i].includes(k))) { headerIdx = i; break }
  }
  if (headerIdx < 0) {
    errors.push('ヘッダー行が見つかりませんでした。対応列: ' + DATE_KEYS.join(' / '))
    return { transactions, errors }
  }

  const result = Papa.parse<Record<string, string>>(lines.slice(headerIdx).join('\n'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^﻿/, ''),
    transform: (v) => v.trim(),
  })

  for (const row of result.data) {
    const dateRaw   = pick(row, DATE_KEYS)
    const desc      = pick(row, DESC_KEYS)
    const debitRaw  = pick(row, DEBIT_KEYS)
    const creditRaw = pick(row, CREDIT_KEYS)

    if (!dateRaw) continue
    const date = normalizeDate(dateRaw)
    if (!date) { errors.push(`日付が不正: "${dateRaw}"`); continue }

    const debit  = parseYen(debitRaw)
    const credit = parseYen(creditRaw)
    if ((debit ?? 0) === 0 && (credit ?? 0) === 0) continue

    const isCredit = credit !== null && credit > 0
    const amount   = isCredit ? credit : -(debit ?? 0)

    transactions.push({
      id: generateId(),
      date,
      description: desc || '三菱UFJ銀行',
      amount,
      type: isCredit ? 'income' : 'expense',
      provider: 'mufg',
      rawData: { date: dateRaw, desc, debit: debitRaw, credit: creditRaw },
    })
  }

  if (transactions.length === 0) {
    errors.push('取引が見つかりませんでした。ヘッダー: ' + (result.meta.fields ?? []).join(', '))
  }

  return { transactions, errors }
}
