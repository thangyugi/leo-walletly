import type { Transaction, Category } from '@/types'
import { generateId } from '@/lib/utils'
import { extractPdfText, flatLines, parseJpDate, extractYearHint } from './pdf-utils'

/**
 * Rakuten Card PDF statement parser (楽天カード ご利用代金請求明細書)
 *
 * Table columns per transaction (row 1 of 2):
 *   利用日 | 利用店名 | 利用者 | 支払方法 | 利用金額 | 手数料/利息 | 支払総額 | 当月請求額 | 翌月繰越残高
 *
 * Sample line (after normalization of split numbers):
 *   "2026/04/01 楽天モバイル通信料 本人 * 1 回払い 3435 0 3435 3435 0"
 *
 * Strategy:
 * 1. Find lines that start with YYYY/MM/DD
 * 2. Split on 本人/家族 to extract store name
 * 3. After payment method ("払い" marker), extract 5 numbers
 * 4. 当月請求額 = 4th number (index 3)
 */

// Detect transaction rows by leading date
const TXN_DATE_RE = /^(\d{4}\/\d{2}\/\d{2})\b/

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/モバイル|通信|ネット|電話|ntt|softbank|docomo|au|jcom|ｊ.ｃｏｍ/.test(d)) return 'utilities'
  if (/コンビニ|スーパー|マート|食|レストラン|カフェ|ファミマ|ローソン|セブン|吉野家|バーミヤン|ヤマザキ|デイリー|弁当|定食/.test(d)) return 'food'
  if (/電車|バス|鉄道|jr|タクシー|ガソリン|駐車|交通|新幹線|ﾃｨｿﾞﾆｰ|suica|pasmo/.test(d)) return 'transport'
  if (/amazon|楽天|ヤフー|ユニクロ|通販|ショッピング|ポケモン|ｾﾝﾀ|センター|オンライン/.test(d)) return 'shopping'
  if (/映画|ゲーム|娯楽|カラオケ|netflix|spotify|アミューズ|テーマパーク/.test(d)) return 'entertainment'
  if (/薬|ドラッグ|病院|クリニック|医|健康|ジム|フィットネス/.test(d)) return 'health'
  return 'other'
}

/** Extract all integers from a string */
function extractIntegers(text: string): number[] {
  const result: number[] = []
  for (const m of text.matchAll(/\b(\d+)\b/g)) {
    result.push(parseInt(m[1]))
  }
  return result
}

/**
 * Parse a single normalized transaction line.
 *
 * Input (example):
 *   "2026/04/01 楽天モバイル通信料 本人 * 1 回払い 3435 0 3435 3435 0"
 *
 * Returns null if the line is not a valid transaction.
 */
function parseLine(
  text: string,
  yearHint: number
): { date: string; storeName: string; billing: number } | null {
  // Must start with YYYY/MM/DD
  const dateMatch = text.match(TXN_DATE_RE)
  if (!dateMatch) return null

  const date = parseJpDate(dateMatch[1], yearHint)
  if (!date) return null

  const rest = text.slice(dateMatch[0].length).trim()

  // ── Store name: everything before 本人 or 家族 ────────────────────────
  // Handle: "本人 *" / "本人*" / "本人＊" / "家族 *"
  const userIdx = rest.search(/本人|家族/)
  const storeName =
    userIdx > 0
      ? rest.slice(0, userIdx).replace(/\s+/g, ' ').trim()
      : ''

  // ── Amount section: after payment method marker ───────────────────────
  // "1 回払い", "1回払い", "リボ払い", "一括", "分割払い" etc.
  // We anchor on "払い" or "一括" which always precedes the amount columns.
  const afterUser = userIdx >= 0 ? rest.slice(userIdx) : rest
  const payIdx = afterUser.search(/払い|一括/)
  const amountSection =
    payIdx >= 0 ? afterUser.slice(payIdx + 2) : afterUser // skip past "払い"

  const nums = extractIntegers(amountSection)

  // Column order after payment method:
  //   [利用金額, 手数料/利息, 支払総額, 当月請求額, 翌月繰越残高]
  //
  // For 1回払い: [3435, 0, 3435, 3435, 0]
  // We want 当月請求額 = index 3; fallback to index 0 if fewer columns.
  if (nums.length === 0) return null

  const billing =
    nums.length >= 4
      ? nums[3]
      : nums.find((n) => n > 0) ?? nums[0]

  if (billing <= 0) return null

  return { date, storeName, billing }
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

  // Transactions are on page 1 only
  const lines = flatLines(pages.slice(0, 1))

  for (const line of lines) {
    const parsed = parseLine(line.text, yearHint)
    if (!parsed) continue

    transactions.push({
      id: generateId(),
      date: parsed.date,
      description: parsed.storeName || '不明',
      amount: -parsed.billing,
      type: 'payment',
      category: guessCategory(parsed.storeName),
      provider: 'rakuten-pay',
      rawData: {
        line: line.text.slice(0, 120),
        billing: String(parsed.billing),
      },
    })
  }

  // If nothing found, provide debug info so the format can be diagnosed
  if (transactions.length === 0) {
    errors.push(`⚠️ 取引が見つかりませんでした。抽出テキスト (先頭15行):`)
    for (const l of lines.slice(0, 15)) {
      if (l.text.trim()) errors.push(`  › "${l.text.slice(0, 100)}"`)
    }
  }

  return { transactions, errors }
}
