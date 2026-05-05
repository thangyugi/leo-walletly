import Papa from 'papaparse'
import type { Transaction, Category } from '@/types'
import { generateId, normalizeDate } from '@/lib/utils'

/**
 * Rakuten Pay CSV column mappings (ラクテンペイ明細)
 * Multiple header variants to handle different export versions.
 */
const DATE_KEYS = ['利用日', '取引日', '日付']
const DESC_KEYS = ['利用店名・商品名', '利用店名', '加盟店名', '店名', '商品名']
const AMOUNT_KEYS = ['利用金額（税込）', '利用金額(税込)', '金額（税込）', '金額', '利用金額']
const POINT_KEYS = ['ポイント利用数', 'ポイント利用', '利用ポイント']
const NOTE_KEYS = ['備考', 'メモ', '摘要']

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

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[¥,，￥\s]/g, '').replace(/円/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : -Math.abs(num)
}

export function parseRakutenPayCSV(text: string): {
  transactions: Transaction[]
  errors: string[]
} {
  const errors: string[] = []
  const transactions: Transaction[] = []

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  })

  if (result.errors.length) {
    errors.push(...result.errors.map((e) => `Row ${e.row}: ${e.message}`))
  }

  for (const row of result.data) {
    const dateRaw = findValue(row, DATE_KEYS)
    const descRaw = findValue(row, DESC_KEYS)
    const amountRaw = findValue(row, AMOUNT_KEYS)
    const noteRaw = findValue(row, NOTE_KEYS)

    if (!dateRaw && !descRaw && !amountRaw) continue

    const date = normalizeDate(dateRaw)
    const amount = parseAmount(amountRaw)

    if (!date) {
      errors.push(`日付が不正: ${JSON.stringify(row)}`)
      continue
    }

    transactions.push({
      id: generateId(),
      date,
      description: descRaw || '不明',
      amount,
      type: amount >= 0 ? 'refund' : 'payment',
      category: guessCategory(descRaw),
      provider: 'rakuten-pay',
      note: noteRaw || undefined,
      rawData: row,
    })
  }

  return { transactions, errors }
}

export function decodeShiftJIS(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('shift-jis').decode(buffer)
  } catch {
    return new TextDecoder('utf-8').decode(buffer)
  }
}
