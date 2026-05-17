import Papa from 'papaparse'
import type { LegacyTransaction as Transaction, LegacyCategory as Category, TransactionType } from '@/types'
import { generateId, normalizeDate } from '@/lib/utils'

// 三井住友銀行 (SMBC) CSV — two common column layouts
// Layout A: 年月日 | お取り扱い内容 | お支払い金額 | お預かり金額 | 残高
// Layout B: 取引年月日 | 摘要 | 支払金額 | 預入金額 | 残高

const DATE_KEYS   = ['年月日', '取引年月日', '取引日']
const DESC_KEYS   = ['お取り扱い内容', '摘要', '内容']
const DEBIT_KEYS  = ['お支払い金額', '支払金額', '出金額']
const CREDIT_KEYS = ['お預かり金額', '預入金額', '入金額']

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) if (row[k] !== undefined) return row[k].trim()
  return ''
}

function parseYen(s: string): number | null {
  const n = parseFloat(s.replace(/[¥,，￥\s円]/g, ''))
  return isNaN(n) ? null : n
}

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/食|レストラン|コンビニ|スーパー|カフェ|ランチ|弁当|grocery/.test(d)) return 'food'
  if (/電車|バス|jr|タクシー|交通|ＪＲ|鉄道|駐車/.test(d)) return 'transport'
  if (/amazon|楽天|ショッピング|通販|購入/.test(d)) return 'shopping'
  if (/映画|ゲーム|娯楽|netflix|spotify/.test(d)) return 'entertainment'
  if (/薬|病院|クリニック|ジム|医療/.test(d)) return 'health'
  if (/電気|ガス|水道|通信|携帯|ntt|softbank|docomo|au/.test(d)) return 'utilities'
  return 'other'
}

function resolveType(debit: number | null, credit: number | null): TransactionType {
  if (credit !== null && credit > 0) return 'income'
  return 'expense'
}

export function parseSMBCCSV(text: string): { transactions: Transaction[]; errors: string[] } {
  const errors: string[] = []
  const transactions: Transaction[] = []

  // Find header row — look for a row containing a date key
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
    const dateRaw  = pick(row, DATE_KEYS)
    const desc     = pick(row, DESC_KEYS)
    const debitRaw = pick(row, DEBIT_KEYS)
    const creditRaw = pick(row, CREDIT_KEYS)

    if (!dateRaw) continue
    const date = normalizeDate(dateRaw)
    if (!date) { errors.push(`日付が不正: "${dateRaw}"`); continue }

    const debit  = parseYen(debitRaw)
    const credit = parseYen(creditRaw)
    if (debit === null && credit === null) continue
    if ((debit ?? 0) === 0 && (credit ?? 0) === 0) continue

    const isCredit = credit !== null && credit > 0
    const amount   = isCredit ? credit : -(debit ?? 0)

    transactions.push({
      id: generateId(),
      date,
      description: desc || '三井住友銀行',
      amount,
      type: resolveType(debit, credit),
      category: guessCategory(desc),
      provider: 'smbc',
      rawData: { date: dateRaw, desc, debit: debitRaw, credit: creditRaw },
    })
  }

  if (transactions.length === 0) {
    errors.push('取引が見つかりませんでした。ヘッダー: ' + (result.meta.fields ?? []).join(', '))
  }

  return { transactions, errors }
}
