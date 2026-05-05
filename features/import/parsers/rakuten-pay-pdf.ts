import type { Transaction, Category } from '@/types'
import { generateId } from '@/lib/utils'
import { extractPdfText, flatLines, parseJpDate, extractYearHint, type PdfTextItem } from './pdf-utils'

/**
 * Rakuten Card PDF statement parser (ご利用代金請求明細書)
 *
 * Table columns on page 1:
 *   利用日 | 利用店名 | 利用者 | 支払方法 | 利用金額 | 手数料/利息 | 支払総額 | 当月請求額 | 翌月繰越残高
 *
 * Transaction rows start with YYYY/MM/DD.
 * Amounts are formatted as "3,435" or "3, 435" (comma-separated with possible spaces).
 * We extract 当月請求額 (col 7) as the expense amount.
 */

const DATE_ROW_RE = /^(\d{4}\/\d{2}\/\d{2})\b/

// Payment method markers
const PAYMENT_RE = /(\d+回払い|リボ払い|リボ変更|分割変更|ボーナス|一括|1\s*回|回払)/

// User column markers
const USER_RE = /\s+(本人|家族)[*＊]?\s*/

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/モバイル|通信|ＳＰ|ネット|電話|ntt|softbank|docomo|au|jcom|ｊ：ｃｏｍ|j:com/.test(d)) return 'utilities'
  if (/コンビニ|スーパー|マート|食|レストラン|カフェ|ファミマ|ローソン|セブン|吉野家|バーミヤン|ヤマザキ|デイリー/.test(d)) return 'food'
  if (/電車|バス|鉄道|jr|タクシー|ガソリン|駐車|エキ|交通|新幹線/.test(d)) return 'transport'
  if (/amazon|楽天|ヤフー|zara|ユニクロ|通販|ショッピング|ポケモン|ｐｏｋｅｍｏｎ|ｾﾝﾀ/.test(d)) return 'shopping'
  if (/映画|ゲーム|娯楽|カラオケ|netflix|spotify|アミューズ/.test(d)) return 'entertainment'
  if (/薬|ドラッグ|病院|クリニック|医|健康|ジム/.test(d)) return 'health'
  return 'other'
}

/**
 * Parse numbers from a list of text items in the amount columns.
 * Handles "3, 435" → 3435, "3,435" → 3435, "0" → 0.
 */
function parseAmountTokens(tokens: string[]): number[] {
  // Join all tokens, then find number groups (handles split "3," + " " + "435")
  const joined = tokens.join(' ')
  // Normalize: remove spaces between digits and commas
  const normalized = joined
    .replace(/(\d)\s*,\s*(\d)/g, '$1,$2') // "3, 435" → "3,435"
    .replace(/,\s+(\d)/g, ',$1')

  const results: number[] = []
  const re = /\b([\d,]+)\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(normalized)) !== null) {
    const n = parseInt(m[1].replace(/,/g, ''), 10)
    if (!isNaN(n)) results.push(n)
  }
  return results
}

/**
 * From a sorted array of X-position-bucketed items on one transaction line,
 * identify and return the amount columns.
 *
 * The Rakuten PDF layout (approximate X thresholds on A4 ~595pt wide):
 *   Date        x < 90
 *   Store name  90 ≤ x < 310
 *   User        310 ≤ x < 360
 *   Pay method  360 ≤ x < 420
 *   Amounts     x ≥ 420  (5 numbers: 利用金額, 手数料, 支払総額, 当月請求額, 翌月繰越)
 *
 * We use the TEXT content to find the column boundaries dynamically.
 */
function extractRowFields(items: PdfTextItem[]): {
  date: string
  storeName: string
  amountTokens: string[]
} | null {
  if (items.length === 0) return null

  // Sort by x
  const sorted = [...items].sort((a, b) => a.x - b.x)

  // Find date item (leftmost item matching date pattern)
  const dateItem = sorted.find((i) => /^\d{4}\/\d{2}\/\d{2}$/.test(i.text.trim()))
  if (!dateItem) return null

  // Find user marker (本人 or 家族)
  const userIdx = sorted.findIndex((i) => /^(本人|家族)[*＊]?$/.test(i.text.trim()))

  // Store name = items between date and user marker (or payment method marker)
  const storeItems =
    userIdx > 0
      ? sorted.slice(1, userIdx)
      : sorted.filter(
          (i) =>
            i.x > dateItem.x &&
            i.x < dateItem.x + 250 && // heuristic: store name within 250pt of date
            !/^\d/.test(i.text.trim()) && // not a number
            !PAYMENT_RE.test(i.text) &&
            !/^(本人|家族)/.test(i.text)
        )

  const storeName = storeItems
    .map((i) => i.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

  // Amount items: everything after user+payment method area (x >= some threshold)
  // Use payment method item x as anchor, or fallback to right ~40% of page
  const paymentItem = sorted.find((i) => PAYMENT_RE.test(i.text))
  const amountAnchorX = paymentItem ? paymentItem.x + 50 : (sorted[sorted.length - 1]?.x ?? 400) - 200

  const amountItems = sorted
    .filter((i) => i.x >= amountAnchorX && /[\d,]/.test(i.text))
    .map((i) => i.text)

  return { date: dateItem.text, storeName, amountTokens: amountItems }
}

export async function parseRakutenPayPDF(file: File): Promise<{
  transactions: Transaction[]
  errors: string[]
}> {
  const transactions: Transaction[] = []
  const errors: string[] = []

  let pages
  try {
    pages = await extractPdfText(file)
  } catch (e) {
    errors.push(`PDF読み込みエラー: ${e instanceof Error ? e.message : String(e)}`)
    return { transactions, errors }
  }

  const yearHint = extractYearHint(pages)

  // Only process page 1 (transaction detail page)
  const allLines = flatLines(pages.slice(0, 1))

  for (const line of allLines) {
    // Quick pre-filter: line must start with YYYY/MM/DD
    if (!DATE_ROW_RE.test(line.text)) continue

    const fields = extractRowFields(line.items)
    if (!fields) continue

    const date = parseJpDate(fields.date, yearHint)
    if (!date) {
      errors.push(`日付解析エラー: ${fields.date}`)
      continue
    }

    const amounts = parseAmountTokens(fields.amountTokens)
    if (amounts.length === 0) {
      errors.push(`金額が見つかりません: ${line.text.slice(0, 60)}`)
      continue
    }

    // Column order: [利用金額, 手数料/利息, 支払総額, 当月請求額, 翌月繰越残高]
    // For 1回払い: 利用金額 = 当月請求額 = 支払総額
    // Take 当月請求額 (index 3) if 5+ numbers, else fallback to first non-zero
    const billingAmount =
      amounts.length >= 4 ? amounts[3] : amounts.find((a) => a > 0) ?? amounts[0]

    if (billingAmount <= 0) continue // Skip 0-yen lines (empty table rows)

    transactions.push({
      id: generateId(),
      date,
      description: fields.storeName || '不明',
      amount: -billingAmount, // Expense (negative)
      type: 'payment',
      category: guessCategory(fields.storeName),
      provider: 'rakuten-pay',
      rawData: {
        raw_line: line.text.slice(0, 120),
        amounts: amounts.join(','),
        billing: String(billingAmount),
      },
    })
  }

  return { transactions, errors }
}
