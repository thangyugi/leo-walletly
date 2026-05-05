import type { Transaction, Category, TransactionType } from '@/types'
import { generateId } from '@/lib/utils'
import { extractPdfText, flatLines, parseJpDate, extractYearHint, parseJpAmount } from './pdf-utils'

/**
 * PayPay PDF statement parser (PayPay利用明細)
 *
 * Typical PayPay PDF table structure:
 *   取引日時 | 取引種別 | 取引名/加盟店名 | 金額（円）| 残高（円）
 *
 * Transaction rows start with YYYY/MM/DD or YYYY年MM月DD日.
 */

const DATE_ROW_RE = /^(\d{4}[\/\-年]\d{1,2}[\/\-月]\d{1,2})/

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/コンビニ|スーパー|マート|食|レストラン|カフェ|ファミマ|ローソン|セブン|吉野家|バーミヤン|マクドナルド|ケンタ/.test(d)) return 'food'
  if (/電車|バス|鉄道|jr|タクシー|ガソリン|駐車|交通|新幹線/.test(d)) return 'transport'
  if (/amazon|楽天|ヤフー|ユニクロ|通販|ショッピング/.test(d)) return 'shopping'
  if (/映画|ゲーム|娯楽|カラオケ|netflix|spotify/.test(d)) return 'entertainment'
  if (/薬|ドラッグ|病院|クリニック|医|健康|ジム/.test(d)) return 'health'
  if (/電気|ガス|水道|通信|ネット|電話|ntt|softbank|docomo|au/.test(d)) return 'utilities'
  return 'other'
}

function resolveType(typeStr: string, amount: number): TransactionType {
  if (/チャージ|入金|受取|ポイント付与/.test(typeStr)) return 'income'
  if (/返金|キャンセル|払戻/.test(typeStr)) return 'refund'
  if (/送金|振込/.test(typeStr)) return 'transfer'
  return amount >= 0 ? 'income' : 'payment'
}

/**
 * From a PayPay transaction line, extract: date, type, description, amount.
 *
 * Approaches:
 * 1. Date is the leftmost item matching a date pattern
 * 2. Type is a keyword like 支払い/チャージ/送金/受取
 * 3. Description is after type, before amount columns
 * 4. Amount is the rightmost number (possibly negative for expenses)
 */
function parsePayPayRow(items: import('./pdf-utils').PdfTextItem[], yearHint: number): {
  date: string
  typeStr: string
  description: string
  amount: number
} | null {
  const sorted = [...items].sort((a, b) => a.x - b.x)

  // Find date
  const dateItem = sorted.find((i) => DATE_ROW_RE.test(i.text.trim()))
  if (!dateItem) return null

  const date = parseJpDate(dateItem.text.trim(), yearHint)
  if (!date) return null

  // Collect remaining items
  const rest = sorted.filter((i) => i.x > dateItem.x)

  // Transaction type keywords
  const TYPE_KEYWORDS = ['支払い', 'チャージ', '送金', '受取', '返金', 'キャンセル', '払戻', 'ポイント']
  const typeItem = rest.find((i) => TYPE_KEYWORDS.some((k) => i.text.includes(k)))
  const typeStr = typeItem?.text.trim() ?? ''

  // Amount items: rightmost numeric values
  const numItems = rest.filter((i) => /^[-−]?[\d,]+$/.test(i.text.trim()))
  if (numItems.length === 0) return null

  // Sort numerics by x: first is usually the amount, last might be balance
  // PayPay shows: amount | balance — we want amount (first/leftmost numeric)
  const amountText = numItems[0].text.trim()
  const rawAmount = parseJpAmount(amountText)
  if (rawAmount === null) return null

  // Description: items between type and amount area
  const amountX = numItems[0].x
  const descItems = rest.filter(
    (i) =>
      !TYPE_KEYWORDS.some((k) => i.text.includes(k)) &&
      !/^[-−]?[\d,]+$/.test(i.text.trim()) &&
      i.x < amountX
  )
  const description = descItems
    .map((i) => i.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

  // Determine sign: チャージ/受取/返金 = positive, 支払い/送金 = negative
  const isCredit = /チャージ|入金|受取|返金|払戻/.test(typeStr)
  const amount = isCredit ? Math.abs(rawAmount) : -Math.abs(rawAmount)

  return { date, typeStr, description: description || typeStr || '不明', amount }
}

export async function parsePayPayPDF(file: File): Promise<{
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
  const allLines = flatLines(pages)

  for (const line of allLines) {
    if (!DATE_ROW_RE.test(line.text)) continue

    const fields = parsePayPayRow(line.items, yearHint)
    if (!fields) continue

    transactions.push({
      id: generateId(),
      date: fields.date,
      description: fields.description,
      amount: fields.amount,
      type: resolveType(fields.typeStr, fields.amount),
      category: guessCategory(fields.description),
      provider: 'paypay',
      rawData: { raw_line: line.text.slice(0, 120) },
    })
  }

  return { transactions, errors }
}
