import type { LegacyTransaction as Transaction } from '@/types'
import { generateId } from '@/lib/utils'
import { extractPdfText, flatLines, extractYearHint, amountsIn, detectPdfKind, pdfPlainText, type PdfLine, type PdfPage } from './pdf-utils'

/**
 * 楽天カード statement / usage-details PDF parser (ご利用代金請求明細書, e-NAVI
 * ご利用明細; 楽天カード, ゴールド, プレミアム…).
 *
 * A purchase row starts with its date, then the shop, then (often) the user
 * (本人 / 家族), the payment method (1回払い, リボ, 分割…) and the amounts:
 *   "2026/04/01 楽天モバイル通信料 本人* 1回払い 3435 0 3435 3435 0"
 *   [利用金額, 手数料/利息, 支払総額, 当月請求額, 翌月繰越残高]
 * Accepted on top of that: 2026/4/1, 2026.04.01, 2026年4月1日, 26/04/01,
 * 04/01 (year from the statement), full-width digits, ¥ / 円, ▲ △ - for
 * refunds, rows without a user column, and shop names wrapped onto the next
 * line. Header lines that also start with a date (お支払日, 請求確定日…) are skipped.
 */

const DATE_RE = /^(?:(\d{4})[/.\-年](\d{1,2})[/.\-月](\d{1,2})日?|(\d{2})\/(\d{1,2})\/(\d{1,2})|(\d{1,2})\/(\d{1,2}))(?=\s|$|[^\d/])/
const NOT_A_PURCHASE = /お支払[い]?日|請求確定|締[め切]?日|お支払[い]?金額|ご請求|合計|小計|口座|引落|振替日|ポイント|お問い合わせ|発行日|作成日|期間/
const USER_RE = /本人|家族\d*|家族会員/
const PAY_RE = /1回払い?|一括払い?|一括[a-f]?|2回払い?|分割(?:払い?)?(?:\d+回)?|リボ(?:払い?|変更)?|ボーナス(?:一括|2回)?(?:払い?)?|ボ1回|ボ2回|ボ併用|分割変更/

export interface RakutenRow { date: string; storeName: string; usage: number; billing: number }

function isoDate(m: RegExpMatchArray, yearHint: number, monthHint: number): string | null {
  let y: number, mo: number, d: number
  if (m[1]) { y = +m[1]; mo = +m[2]; d = +m[3] }
  else if (m[4]) { y = 2000 + +m[4]; mo = +m[5]; d = +m[6] }
  else {
    mo = +m[7]; d = +m[8]
    // MM/DD: the statement's year; a later month than the statement's belongs to last year.
    y = monthHint && mo > monthHint ? yearHint - 1 : yearHint
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** One text line → a purchase, or null (header, totals, notes…). Exported for tests. */
export function parseRakutenLine(text: string, yearHint: number, monthHint = 0): RakutenRow | null {
  const m = text.match(DATE_RE)
  if (!m) return null
  const date = isoDate(m, yearHint, monthHint)
  if (!date) return null
  const rest = text.slice(m[0].length).trim()
  if (!rest || NOT_A_PURCHASE.test(rest.slice(0, 16))) return null

  // The shop runs up to the user column, else the payment method, else the first amount.
  const userAt = rest.search(USER_RE)
  const payAt = rest.search(PAY_RE)
  // No user / payment column: the amounts are the run of numbers at the end of the line.
  const tokens = rest.split(' ')
  let k = tokens.length
  while (k > 1 && /^[-−▲△]?[¥￥]?(\d{1,3}(,\d{3})+|\d+)円?$/.test(tokens[k - 1])) k--
  const trailingAt = k < tokens.length ? tokens.slice(0, k).join(' ').length : -1
  const storeEnd = userAt > 0 ? userAt : payAt > 0 ? payAt : trailingAt > 0 ? trailingAt : rest.length
  const storeName = rest.slice(0, storeEnd).replace(/\s+/g, ' ').replace(/[*＊]+$/, '').trim()

  // Amounts come after the payment method when there is one.
  const after = payAt >= 0 ? rest.slice(payAt).replace(PAY_RE, ' ') : rest.slice(storeEnd)
  const nums = amountsIn(after.replace(USER_RE, ' '))
  if (nums.length === 0 || !storeName) return null
  const usage = nums[0]
  const billing = nums.length >= 4 ? nums[3] : usage
  if (usage === 0 && billing === 0) return null
  return { date, storeName, usage, billing }
}

/** Rows from already-extracted pages. */
export function parseRakutenCardPages(pages: PdfPage[]): { transactions: Transaction[]; errors: string[] } {
  const transactions: Transaction[] = []
  const errors: string[] = []
  const yearHint = extractYearHint(pages)
  // Statement month (e.g. "2026年4月"), to place MM/DD rows in the right year.
  const monthMatch = pdfPlainText(pages).match(/\d{4}年\s*(\d{1,2})月/)
  const monthHint = monthMatch ? +monthMatch[1] : 0
  const lines: PdfLine[] = flatLines(pages)

  for (let i = 0; i < lines.length; i++) {
    let text = lines[i].text
    let parsed = parseRakutenLine(text, yearHint, monthHint)
    // The shop name wrapped: date + shop on this line, amounts on the next one(s).
    for (let k = 1; !parsed && k <= 2 && DATE_RE.test(text) && i + k < lines.length && !DATE_RE.test(lines[i + k].text); k++) {
      text = `${text} ${lines[i + k].text}`
      parsed = parseRakutenLine(text, yearHint, monthHint)
      if (parsed) i += k
    }
    if (!parsed) continue
    // The rest of a long shop name on the next line (no date, no amounts).
    const next = lines[i + 1]?.text
    if (next && !DATE_RE.test(next) && amountsIn(next).length === 0 && next.length <= 40 && !NOT_A_PURCHASE.test(next)) {
      parsed.storeName = `${parsed.storeName}${next.trim()}`
      i++
    }
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
      rawData: { line: lines[i].text.slice(0, 120), usage: String(parsed.usage), billing: String(parsed.billing) },
    })
  }
  return { transactions, errors }
}

/** Is this PDF a Rakuten Card statement? */
export function isRakutenCardStatement(text: string): boolean {
  return detectPdfKind(text) === 'rakuten_card'
}

export async function parseRakutenCardPDF(file: File): Promise<{ transactions: Transaction[]; errors: string[] }> {
  const pages = await extractPdfText(file)
  if (!isRakutenCardStatement(pdfPlainText(pages))) return { transactions: [], errors: [] }
  return parseRakutenCardPages(pages)
}
