import type { LegacyTransaction as Transaction, TransactionType } from '@/types'
import { generateId } from '@/lib/utils'
import { extractPdfText, flatLines, parseJpDate, extractYearHint, amountsIn, type PdfPage } from './pdf-utils'

/**
 * PayPay PDF statement parser
 *
 * Typical layout:
 *   取引日時 | 取引種別 | 取引名/加盟店名 | 金額（円）| 残高（円）
 */

const DATE_ROW_RE = /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/

function resolveType(typeStr: string, amount: number): TransactionType {
  if (/チャージ|入金|受取|ポイント付与/.test(typeStr)) return 'income'
  if (/返金|キャンセル|払戻/.test(typeStr)) return 'refund'
  if (/送金|振込/.test(typeStr)) return 'transfer'
  return amount >= 0 ? 'income' : 'expense'
}

const TYPE_KEYWORDS = ['支払い', 'チャージ', '送金', '受取', '返金', 'キャンセル', '払戻', 'ポイント']

export async function parsePayPayPDF(file: File): Promise<{ transactions: Transaction[]; errors: string[] }> {
  return parsePayPayPages(await extractPdfText(file))
}

/** Rows from already-extracted pages. */
export function parsePayPayPages(pages: PdfPage[]): { transactions: Transaction[]; errors: string[] } {
  const transactions: Transaction[] = []
  const errors: string[] = []

  const yearHint = extractYearHint(pages)
  const lines = flatLines(pages)

  for (const line of lines) {
    const text = line.text
    const dateMatch = text.match(DATE_ROW_RE)
    if (!dateMatch) continue

    const date = parseJpDate(dateMatch[1], yearHint)
    if (!date) continue

    const afterDate = text.slice(dateMatch.index! + dateMatch[0].length).trim()

    // Find type keyword
    const typeKw = TYPE_KEYWORDS.find((k) => afterDate.includes(k)) ?? ''

    // Amounts (not times like 12:34 or counts): the first is the amount, the last the balance.
    const nums = amountsIn(afterDate.replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' '))
    if (nums.length === 0) continue
    const rawAmount = Math.abs(nums[0])
    if (isNaN(rawAmount) || rawAmount <= 0) continue

    // Description: text before amounts
    const firstNumIdx = afterDate.search(/\d/)
    const descText = firstNumIdx > 0 ? afterDate.slice(0, firstNumIdx) : ''
    const description =
      descText.replace(new RegExp(TYPE_KEYWORDS.join('|'), 'g'), '').replace(/\s+/g, ' ').trim() ||
      typeKw ||
      '不明'

    const isCredit = /チャージ|入金|受取|返金|払戻/.test(typeKw)
    const amount = isCredit ? rawAmount : -rawAmount

    transactions.push({
      id: generateId(),
      date,
      description,
      amount,
      type: resolveType(typeKw, amount),
      provider: 'paypay',
      rawData: { line: text.slice(0, 120) },
    })
  }

  return { transactions, errors }
}
