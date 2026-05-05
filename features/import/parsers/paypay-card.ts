import Papa from 'papaparse'
import type { Transaction, Category, TransactionType } from '@/types'
import { generateId, normalizeDate } from '@/lib/utils'

/**
 * PayPayカード（クレジットカード）CSV明細パーサー
 *
 * Columns:
 *   利用日/キャンセル日 | 利用店名・商品名 | 利用者 | 決済方法 | 支払区分
 *   利用金額 | 手数料 | 支払総額 | 当月支払金額 | 翌月以降繰越金額 | 調整額 | 当月お支払日
 */

const DATE_KEY = '利用日/キャンセル日'
const STORE_KEY = '利用店名・商品名'
const AMOUNT_KEY = '利用金額'
const METHOD_KEY = '決済方法'
const PAYMENT_TYPE_KEY = '支払区分'

// PayPay残高チャージ = transfer (not an expense, avoids double counting)
const TRANSFER_RE = /paypay残高|残高チャージ|paypayチャージ/i

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/コンビニ|スーパー|マート|食|レストラン|カフェ|ファミマ|ローソン|セブン|吉野家|すき家|マクド|ケンタ|デイリー|ヤマザキ/.test(d))
    return 'food'
  if (/電車|バス|鉄道|jr|ＪＲ|タクシー|ガソリン|駐車|交通|新幹線|エキ|ミドリノ|ＭＶ|エクスプレス/.test(d))
    return 'transport'
  if (/amazon|アマゾン|楽天|ヤフー|ユニクロ|通販|ショッピング|ネット|オンライン/.test(d))
    return 'shopping'
  if (/映画|ゲーム|娯楽|カラオケ|netflix|spotify|アミューズ/.test(d))
    return 'entertainment'
  if (/薬|ドラッグ|病院|クリニック|医|健康|ジム|フィットネス/.test(d))
    return 'health'
  if (/電気|ガス|水道|通信|ネット|電話|ntt|softbank|docomo|au|モバイル/.test(d))
    return 'utilities'
  return 'other'
}

function resolveType(storeName: string): TransactionType {
  if (TRANSFER_RE.test(storeName)) return 'transfer'
  return 'payment'
}

function parseYen(raw: string): number | null {
  const cleaned = raw.replace(/[¥,，￥\s円]/g, '').trim()
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

export function parsePayPayCardCSV(text: string): {
  transactions: Transaction[]
  errors: string[]
} {
  const errors: string[] = []
  const transactions: Transaction[] = []

  // Skip metadata rows before header
  const lines = text.split('\n')
  let dataStart = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(DATE_KEY)) {
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
    errors.push(...result.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`))
  }

  for (const row of result.data) {
    const dateRaw = (row[DATE_KEY] ?? '').trim()
    const storeName = (row[STORE_KEY] ?? '').trim()
    const amountRaw = (row[AMOUNT_KEY] ?? '').trim()

    if (!dateRaw && !storeName && !amountRaw) continue

    const date = normalizeDate(dateRaw)
    if (!date) {
      errors.push(`日付が不正: "${dateRaw}"`)
      continue
    }

    const amount = parseYen(amountRaw)
    if (amount === null || amount <= 0) continue

    const type = resolveType(storeName)

    transactions.push({
      id: generateId(),
      date,
      description: storeName || '不明',
      amount: -amount, // credit card charges are always expenses
      type,
      category: type === 'transfer' ? 'other' : guessCategory(storeName),
      provider: 'paypay-card',
      rawData: {
        date: dateRaw,
        store: storeName,
        amount: amountRaw,
        method: row[METHOD_KEY] ?? '',
        paymentType: row[PAYMENT_TYPE_KEY] ?? '',
      },
    })
  }

  if (transactions.length === 0) {
    const headers = result.meta.fields ?? []
    errors.push(`⚠️ 取引が見つかりませんでした。検出されたヘッダー: [${headers.join(', ')}]`)
    for (const row of result.data.slice(0, 3)) {
      errors.push(`  › ${JSON.stringify(row).slice(0, 120)}`)
    }
  }

  return { transactions, errors }
}
