import Papa from 'papaparse'
import type { Transaction, Category, TransactionType } from '@/types'
import { generateId, normalizeDate } from '@/lib/utils'

/**
 * PayPay CSV column mappings (ペイペイ利用明細)
 * Multiple header variants across different export versions.
 */
const DATE_KEYS = ['取引日時', '取引日', '日付', '決済日時', '決済日']
const DESC_KEYS = ['取引名', '店舗名', '支払先', '内容', '摘要', '利用先']
const AMOUNT_KEYS = ['金額（円）', '金額(円)', '金額', '決済金額', '利用金額']
const TYPE_KEYS = ['取引種別', '種別', '取引区分']
const BALANCE_KEYS = ['残高（円）', '残高(円)', '残高']

function findValue(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key].trim()
  }
  return ''
}

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/コンビニ|スーパー|マート|食|レストラン|カフェ|ファミマ|ローソン|セブン|吉野家|すき家|マクドナルド|ケンタ|pizza|すし/.test(d))
    return 'food'
  if (/電車|バス|鉄道|jr|タクシー|ガソリン|駐車|エキ|metro|subway|交通|新幹線/.test(d))
    return 'transport'
  if (/amazon|楽天|ヤフー|zara|ユニクロ|ネット|通販|ショッピング|shopping/.test(d))
    return 'shopping'
  if (/映画|ゲーム|娯楽|カラオケ|ネットフリックス|netflix|spotify|アミューズ/.test(d))
    return 'entertainment'
  if (/薬|ドラッグ|病院|クリニック|医|健康|fitness|gym|ジム/.test(d)) return 'health'
  if (/電気|ガス|水道|光熱|通信|ネット|電話|ntt|softbank|docomo|au/.test(d))
    return 'utilities'
  return 'other'
}

function resolveType(typeStr: string, amount: number): TransactionType {
  if (/チャージ|入金|受取/.test(typeStr)) return 'income'
  if (/返金|キャンセル|払戻/.test(typeStr)) return 'refund'
  if (/送金|振込/.test(typeStr)) return 'transfer'
  return amount >= 0 ? 'income' : 'payment'
}

function parseAmount(raw: string, typeStr: string): number {
  const cleaned = raw.replace(/[¥,，￥\s]/g, '').replace(/円/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0

  const isCredit = /チャージ|入金|受取|返金/.test(typeStr)
  return isCredit ? Math.abs(num) : -Math.abs(num)
}

export function parsePayPayCSV(text: string): {
  transactions: Transaction[]
  errors: string[]
} {
  const errors: string[] = []
  const transactions: Transaction[] = []

  // PayPay CSV sometimes has BOM or extra header rows – skip lines not starting with a date-like pattern until header found
  const lines = text.split('\n')
  let dataStart = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (DATE_KEYS.some((k) => line.includes(k))) {
      dataStart = i
      break
    }
  }
  const cleanedText = lines.slice(dataStart).join('\n')

  const result = Papa.parse<Record<string, string>>(cleanedText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^﻿/, ''),
    transform: (v) => v.trim(),
  })

  if (result.errors.length) {
    errors.push(...result.errors.map((e) => `Row ${e.row}: ${e.message}`))
  }

  for (const row of result.data) {
    const dateRaw = findValue(row, DATE_KEYS)
    const descRaw = findValue(row, DESC_KEYS)
    const amountRaw = findValue(row, AMOUNT_KEYS)
    const typeRaw = findValue(row, TYPE_KEYS)

    if (!dateRaw && !descRaw && !amountRaw) continue

    const date = normalizeDate(dateRaw.split(' ')[0])
    const amount = parseAmount(amountRaw, typeRaw)
    const type = resolveType(typeRaw, amount)

    if (!date) {
      errors.push(`日付が不正: ${JSON.stringify(row)}`)
      continue
    }

    transactions.push({
      id: generateId(),
      date,
      description: descRaw || typeRaw || '不明',
      amount,
      type,
      category: guessCategory(descRaw),
      provider: 'paypay',
      rawData: row,
    })
  }

  return { transactions, errors }
}
