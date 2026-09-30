import type { LegacyTransaction as Transaction } from '@/types'
import { generateId } from '@/lib/utils'
import { extractPdfText, flatLines, parseJpDate, extractYearHint } from './pdf-utils'

/**
 * 楽天カード ご利用代金請求明細書 (PDF) parser.
 *
 * Statement rows (page 1, after number normalization):
 *   利用日 | 利用店名 | 利用者 | 支払方法 | 利用金額 | 手数料/利息 | 支払総額 | 当月請求額 | 翌月繰越残高
 *   "2026/04/01 楽天モバイル通信料 本人* 1回払い 3435 0 3435 3435 0"
 *
 * Only lines with a 利用者 (本人 / 家族) are purchases: the header block also
 * starts with dates (お支払日 2026/04/27 … 請求確定日 2026/04/21) and must not
 * turn into rows. A negative 利用金額 is a refund / cancellation.
 */

const TXN_DATE_RE = /^(\d{4}\/\d{2}\/\d{2})\b/
const USER_RE = /本人|家族/

/** Is this PDF a Rakuten Card statement? */
export function isRakutenCardStatement(text: string): boolean {
  return /楽天カード/.test(text) && /ご利用明細|ご利用代金請求明細書/.test(text)
}

function parseLine(text: string, yearHint: number): { date: string; storeName: string; usage: number; billing: number } | null {
  const dateMatch = text.match(TXN_DATE_RE)
  if (!dateMatch) return null
  const date = parseJpDate(dateMatch[1], yearHint)
  if (!date) return null

  const rest = text.slice(dateMatch[0].length).trim()
  const userIdx = rest.search(USER_RE)
  if (userIdx < 0) return null
  const storeName = rest.slice(0, userIdx).replace(/\s+/g, ' ').trim()

  // Amount columns follow the payment method ("1回払い", "リボ払い", "一括", …).
  const afterUser = rest.slice(userIdx)
  const payMatch = afterUser.match(/払い|一括[a-f]?|リボ変更|分割変更|ボ1回|ボ2回|ボ併用/)
  const amountSection = payMatch ? afterUser.slice((payMatch.index ?? 0) + payMatch[0].length) : afterUser
  const nums = [...amountSection.matchAll(/-?\d+/g)].map((m) => parseInt(m[0], 10))
  if (nums.length === 0) return null

  // [利用金額, 手数料/利息, 支払総額, 当月請求額, 翌月繰越残高]
  const usage = nums[0]
  const billing = nums.length >= 4 ? nums[3] : usage
  if (usage === 0 && billing === 0) return null
  return { date, storeName, usage, billing }
}

export async function parseRakutenCardPDF(file: File): Promise<{ transactions: Transaction[]; errors: string[] }> {
  const transactions: Transaction[] = []
  const errors: string[] = []

  let pages
  try {
    pages = await extractPdfText(file)
  } catch (e) {
    errors.push(`PDF読み込みエラー: ${e instanceof Error ? e.message : String(e)}`)
    return { transactions, errors }
  }

  const allText = flatLines(pages).map((l) => l.text).join('\n')
  if (!isRakutenCardStatement(allText)) return { transactions, errors }

  const yearHint = extractYearHint(pages)
  const lines = flatLines(pages)

  for (const line of lines) {
    const parsed = parseLine(line.text, yearHint)
    if (!parsed) continue
    // The purchase amount is what the card was used for; installment plans
    // bill it over several statements, but the spending happened once.
    const amount = parsed.usage !== 0 ? parsed.usage : parsed.billing
    transactions.push({
      id: generateId(),
      date: parsed.date,
      description: parsed.storeName || '不明',
      amount: -amount, // charge → expense (negative), refund → income (positive)
      type: amount < 0 ? 'income' : 'expense',
      provider: 'rakuten_card',
      rawData: { line: line.text.slice(0, 120), usage: String(parsed.usage), billing: String(parsed.billing) },
    })
  }

  if (transactions.length === 0) {
    errors.push('⚠️ 楽天カードの明細行が見つかりませんでした。抽出テキスト (先頭15行):')
    for (const l of lines.slice(0, 15)) if (l.text.trim()) errors.push(`  › "${l.text.slice(0, 100)}"`)
  }

  return { transactions, errors }
}
