import Papa from 'papaparse'
import type { LegacyTransaction as Transaction } from '@/types'
import { generateId, normalizeDate } from '@/lib/utils'

/**
 * 楽天カード ご利用明細 CSV (楽天e-NAVI → 明細のダウンロード).
 *
 * Columns:
 *   利用日 | 利用店名・商品名 | 利用者 | 支払方法 | 利用金額 | 支払手数料 | 支払総額
 *   | M月支払金額 | M月繰越残高 | 新規サイン
 *
 * A negative 利用金額 is a refund / cancellation (recorded as income).
 * (PayPay Card uses 利用日/キャンセル日 and 支払区分, so the two don't collide.)
 */

const DATE_KEY = '利用日'
const STORE_KEY = '利用店名・商品名'
const AMOUNT_KEY = '利用金額'
const TOTAL_KEY = '支払総額'
const METHOD_KEY = '支払方法'
const USER_KEY = '利用者'

function parseYen(raw: string | undefined): number | null {
  const cleaned = (raw ?? '').replace(/[¥,，￥\s円]/g, '').replace(/[−ー－]/g, '-').trim()
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

export function parseRakutenCardCSV(text: string): { transactions: Transaction[]; errors: string[] } {
  const errors: string[] = []
  const transactions: Transaction[] = []

  const lines = text.split('\n')
  const headerIdx = lines.findIndex((l) => l.includes(STORE_KEY) && l.includes(DATE_KEY))
  const result = Papa.parse<Record<string, string>>(lines.slice(Math.max(headerIdx, 0)).join('\n'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^﻿/, ''),
    transform: (v) => v.trim(),
  })

  for (const row of result.data) {
    const dateRaw = row[DATE_KEY] ?? ''
    const storeName = row[STORE_KEY] ?? ''
    // Summary / continuation lines have no date.
    if (!dateRaw) continue
    const date = normalizeDate(dateRaw)
    if (!date) { errors.push(`日付が不正: "${dateRaw}"`); continue }

    const amount = parseYen(row[AMOUNT_KEY]) ?? parseYen(row[TOTAL_KEY])
    if (amount === null || amount === 0) continue

    transactions.push({
      id: generateId(),
      date,
      description: storeName || '不明',
      amount: -amount, // charge → expense (negative), refund → income (positive)
      type: amount < 0 ? 'income' : 'expense',
      provider: 'rakuten_card',
      rawData: { date: dateRaw, store: storeName, user: row[USER_KEY] ?? '', method: row[METHOD_KEY] ?? '', amount: row[AMOUNT_KEY] ?? '', total: row[TOTAL_KEY] ?? '' },
    })
  }

  if (transactions.length === 0) {
    errors.push(`⚠️ 取引が見つかりませんでした。検出されたヘッダー: [${(result.meta.fields ?? []).join(', ')}]`)
  }
  return { transactions, errors }
}
