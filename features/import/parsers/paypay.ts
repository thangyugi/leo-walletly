import Papa from 'papaparse'
import type { LegacyTransaction as Transaction, LegacyCategory as Category, TransactionType } from '@/types'
import { generateId, normalizeDate } from '@/lib/utils'

/**
 * PayPay CSV column mappings.
 * Supports both Japanese and English export variants.
 */

// Japanese variant
const DATE_KEYS_JA = ['取引日時', '取引日', '日付', '決済日時', '決済日']
const DESC_KEYS_JA = ['取引名/加盟店名', '取引名', '加盟店名', '店舗名', '支払先', '内容', '摘要', '利用先']
const AMOUNT_KEYS_JA = ['金額（円）', '金額(円)', '金額', '決済金額', '利用金額']
const TYPE_KEYS_JA = ['取引種別', '種別', '取引区分']

// English variant (exported from PayPay app English UI)
const DATE_KEY_EN = 'Date & Time'
const DESC_KEY_EN = 'Business Name'
const OUTGOING_KEY_EN = 'Amount Outgoing (Yen)'
const INCOMING_KEY_EN = 'Amount Incoming (Yen)'
const TYPE_KEY_EN = 'Transaction Type'

const ALL_DATE_KEYS = [...DATE_KEYS_JA, DATE_KEY_EN]

function findValue(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key].trim()
  }
  return ''
}

function parseYen(raw: string): number | null {
  const cleaned = raw.replace(/[¥,，￥\s円\-－]/g, '').trim()
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/コンビニ|スーパー|マート|食|レストラン|カフェ|ファミマ|ローソン|セブン|吉野家|すき家|マクドナルド|ケンタ|pizza|すし|cafe|restaurant|food|grocery/.test(d))
    return 'food'
  if (/電車|バス|鉄道|jr|タクシー|ガソリン|駐車|エキ|metro|subway|交通|新幹線|taxi|train|transit/.test(d))
    return 'transport'
  if (/amazon|楽天|ヤフー|zara|ユニクロ|ネット|通販|ショッピング|shopping|store|shop/.test(d))
    return 'shopping'
  if (/映画|ゲーム|娯楽|カラオケ|ネットフリックス|netflix|spotify|アミューズ|game|cinema|entertainment/.test(d))
    return 'entertainment'
  if (/薬|ドラッグ|病院|クリニック|医|健康|fitness|gym|ジム|pharmacy|hospital|clinic/.test(d))
    return 'health'
  if (/電気|ガス|水道|光熱|通信|ネット|電話|ntt|softbank|docomo|au|mobile|internet|utility/.test(d))
    return 'utilities'
  return 'other'
}

function resolveType(typeStr: string, amount: number): TransactionType {
  const t = typeStr.toLowerCase()
  // チャージ = loading money from bank/card into PayPay balance = internal transfer, not income
  if (/チャージ|charge|top.?up/.test(t)) return 'transfer'
  if (/受取|incoming|received/.test(t)) return 'income'
  if (/返金|キャンセル|払戻|refund|cancel/.test(t)) return 'refund'
  if (/送金|振込|transfer|send/.test(t)) return 'transfer'
  return amount >= 0 ? 'income' : 'expense'
}

function isEnglishFormat(headers: string[]): boolean {
  return headers.includes(DATE_KEY_EN) || headers.includes(OUTGOING_KEY_EN)
}

function parseRowEnglish(
  row: Record<string, string>
): { date: string; description: string; amount: number; typeStr: string } | null {
  const dateRaw = (row[DATE_KEY_EN] ?? '').trim()
  if (!dateRaw) return null

  const date = normalizeDate(dateRaw.split(' ')[0])
  if (!date) return null

  const description = (row[DESC_KEY_EN] ?? '').trim() || (row[TYPE_KEY_EN] ?? '').trim() || '不明'
  const typeStr = (row[TYPE_KEY_EN] ?? '').trim()

  const outgoing = parseYen(row[OUTGOING_KEY_EN] ?? '')
  const incoming = parseYen(row[INCOMING_KEY_EN] ?? '')

  let amount: number
  if (incoming !== null && incoming > 0) {
    amount = incoming
  } else if (outgoing !== null && outgoing > 0) {
    amount = -outgoing
  } else {
    return null
  }

  return { date, description, amount, typeStr }
}

function parseRowJapanese(
  row: Record<string, string>
): { date: string; description: string; amount: number; typeStr: string } | null {
  const dateRaw = findValue(row, DATE_KEYS_JA)
  const descRaw = findValue(row, DESC_KEYS_JA)
  const amountRaw = findValue(row, AMOUNT_KEYS_JA)
  const typeRaw = findValue(row, TYPE_KEYS_JA)

  if (!dateRaw && !descRaw && !amountRaw) return null

  const date = normalizeDate(dateRaw.split(' ')[0])
  if (!date) return null

  const rawNum = parseYen(amountRaw)
  if (rawNum === null) return null

  const isCredit = /チャージ|入金|受取|返金/.test(typeRaw)
  const amount = isCredit ? Math.abs(rawNum) : -Math.abs(rawNum)
  const description = descRaw || typeRaw || '不明'

  return { date, description, amount, typeStr: typeRaw }
}

export function parsePayPayCSV(text: string): {
  transactions: Transaction[]
  errors: string[]
} {
  const errors: string[] = []
  const transactions: Transaction[] = []

  // Skip metadata rows before header (find first row containing a known date key)
  const lines = text.split('\n')
  let dataStart = 0
  for (let i = 0; i < lines.length; i++) {
    if (ALL_DATE_KEYS.some((k) => lines[i].includes(k))) {
      dataStart = i
      break
    }
  }

  const result = Papa.parse<Record<string, string>>(lines.slice(dataStart).join('\n'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^﻿/, ''),
    transform: (v) => v.trim(),
  })

  if (result.errors.length) {
    errors.push(...result.errors.map((e) => `Row ${e.row}: ${e.message}`))
  }

  const headers = result.meta.fields ?? []
  const english = isEnglishFormat(headers)

  for (const row of result.data) {
    const parsed = english ? parseRowEnglish(row) : parseRowJapanese(row)
    if (!parsed) continue

    transactions.push({
      id: generateId(),
      date: parsed.date,
      description: parsed.description,
      amount: parsed.amount,
      type: resolveType(parsed.typeStr, parsed.amount),
      category: guessCategory(parsed.description),
      provider: 'paypay',
      rawData: row,
    })
  }

  if (transactions.length === 0) {
    errors.push(`⚠️ 取引が見つかりませんでした。検出されたヘッダー: [${headers.join(', ')}]`)
    for (const row of result.data.slice(0, 3)) {
      errors.push(`  › ${JSON.stringify(row).slice(0, 120)}`)
    }
  }

  return { transactions, errors }
}
