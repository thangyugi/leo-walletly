import Papa from 'papaparse'
import type { Transaction, Category } from '@/types'
import { generateId, normalizeDate } from '@/lib/utils'

// Generic CSV parser with intelligent column auto-detection
// Scores each header against known patterns for date / amount / description

export interface ColumnMapping {
  dateCol:    string
  amountCol:  string | null   // single signed amount column
  debitCol:   string | null   // expense column
  creditCol:  string | null   // income column
  descCol:    string
  headers:    string[]
}

// --- Scoring helpers ---------------------------------------------------------

const DATE_PATTERNS = [
  /日付|日時|取引日|年月日|date|ngày|ngay|fecha|datum/i,
  /\bdate\b|\bday\b|\bdt\b/i,
]
const DESC_PATTERNS = [
  /摘要|内容|説明|店名|商品|description|memo|mô tả|nội dung|diễn giải|detail|narration/i,
  /desc|store|merchant|payee|recipient|note/i,
]
const AMOUNT_PATTERNS = [
  /金額|amount|số tiền|tiền|importe|betrag/i,
  /\bamount\b|\bamt\b|\bsum\b|\btotal\b/i,
]
const DEBIT_PATTERNS = [
  /支払|出金|引き落とし|debit|withdrawal|tiền ra|phát sinh nợ|ghi nợ/i,
  /\bdebit\b|\bwithdraw\b|\bexpense\b|\bout\b/i,
]
const CREDIT_PATTERNS = [
  /預かり|入金|credit|deposit|tiền vào|phát sinh có|ghi có/i,
  /\bcredit\b|\bdeposit\b|\bincome\b|\bin\b/i,
]

function scoreHeader(header: string, patterns: RegExp[]): number {
  return patterns.reduce((acc, re) => acc + (re.test(header) ? 1 : 0), 0)
}

export function detectColumns(headers: string[]): ColumnMapping {
  type Scored = { col: string; score: number }

  const score = (patterns: RegExp[]): Scored[] =>
    headers.map((h) => ({ col: h, score: scoreHeader(h, patterns) }))
           .sort((a, b) => b.score - a.score)

  const dates   = score(DATE_PATTERNS)
  const descs   = score(DESC_PATTERNS)
  const amounts = score(AMOUNT_PATTERNS)
  const debits  = score(DEBIT_PATTERNS)
  const credits = score(CREDIT_PATTERNS)

  const dateCol = dates[0]?.score > 0   ? dates[0].col   : headers[0] ?? ''
  const descCol = descs[0]?.score > 0   ? descs[0].col   : headers[1] ?? ''

  const hasDebitCredit = debits[0]?.score > 0 && credits[0]?.score > 0
  const debitCol  = hasDebitCredit ? debits[0].col  : null
  const creditCol = hasDebitCredit ? credits[0].col : null
  const amountCol = !hasDebitCredit && amounts[0]?.score > 0 ? amounts[0].col : null

  return { dateCol, amountCol, debitCol, creditCol, descCol, headers }
}

// --- Date normalization -------------------------------------------------------

function parseAnyDate(raw: string): string {
  const s = raw.trim()
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`
  return normalizeDate(s)
}

// --- Amount parsing ----------------------------------------------------------

function parseNumber(s: string): number | null {
  if (!s) return null
  // Remove currency symbols, spaces; keep minus sign
  const cleaned = s.replace(/[¥$€£₫đ\s]/g, '').replace(/,/g, '').trim()
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// --- Category heuristics (multilingual) --------------------------------------

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/食|ăn|uống|food|restaurant|cafe|コンビニ|スーパー|supermarket|grocery/.test(d)) return 'food'
  if (/交通|transport|grab|taxi|train|電車|バス|xe|xăng|bay|flight/.test(d)) return 'transport'
  if (/shop|shopping|amazon|lazada|shopee|楽天|mua|store|mall/.test(d)) return 'shopping'
  if (/entertainment|game|ゲーム|movie|phim|netflix|spotify|karaoke|娯楽/.test(d)) return 'entertainment'
  if (/health|gym|医|病院|thuốc|pharmacy|clinic|khám/.test(d)) return 'health'
  if (/electric|water|gas|internet|phone|điện|nước|通信|電気/.test(d)) return 'utilities'
  return 'other'
}

// --- Main export -------------------------------------------------------------

export function parseGenericCSV(
  text: string,
  mapping?: Partial<ColumnMapping>
): { transactions: Transaction[]; errors: string[]; mapping: ColumnMapping } {
  const errors: string[] = []
  const transactions: Transaction[] = []

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^﻿/, ''),
    transform: (v) => v.trim(),
  })

  const headers = result.meta.fields ?? []
  const detected = detectColumns(headers)
  const col: ColumnMapping = {
    dateCol:   mapping?.dateCol   ?? detected.dateCol,
    amountCol: mapping?.amountCol ?? detected.amountCol,
    debitCol:  mapping?.debitCol  ?? detected.debitCol,
    creditCol: mapping?.creditCol ?? detected.creditCol,
    descCol:   mapping?.descCol   ?? detected.descCol,
    headers,
  }

  if (!col.dateCol) {
    errors.push('日付列を特定できませんでした。列マッピングを手動で選択してください。')
    return { transactions, errors, mapping: col }
  }
  if (!col.amountCol && !col.debitCol) {
    errors.push('金額列を特定できませんでした。列マッピングを手動で選択してください。')
    return { transactions, errors, mapping: col }
  }

  for (const row of result.data) {
    const dateRaw = row[col.dateCol] ?? ''
    if (!dateRaw) continue
    const date = parseAnyDate(dateRaw)
    if (!date) { errors.push(`不正な日付: "${dateRaw}"`); continue }

    const desc = col.descCol ? (row[col.descCol] ?? '') : ''

    let amount: number
    if (col.debitCol && col.creditCol) {
      const debit  = parseNumber(row[col.debitCol] ?? '')
      const credit = parseNumber(row[col.creditCol] ?? '')
      if ((debit ?? 0) === 0 && (credit ?? 0) === 0) continue
      amount = credit !== null && credit > 0 ? credit : -(debit ?? 0)
    } else if (col.amountCol) {
      const raw = parseNumber(row[col.amountCol] ?? '')
      if (raw === null) continue
      amount = raw
    } else {
      continue
    }

    transactions.push({
      id: generateId(),
      date,
      description: desc || 'Unknown',
      amount,
      type: amount >= 0 ? 'income' : 'payment',
      category: guessCategory(desc),
      provider: 'generic-csv',
      rawData: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)])),
    })
  }

  if (transactions.length === 0 && errors.length === 0) {
    errors.push(`取引が見つかりませんでした。検出列: date="${col.dateCol}", amount="${col.amountCol ?? col.debitCol}"`)
  }

  return { transactions, errors, mapping: col }
}

// Convenience: just detect without parsing
export function detectColumnsFromCSV(text: string): ColumnMapping {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    preview: 1,
    transformHeader: (h) => h.trim().replace(/^﻿/, ''),
  })
  return detectColumns(result.meta.fields ?? [])
}
