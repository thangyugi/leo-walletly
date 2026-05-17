import type { LegacyTransaction as Transaction, LegacyCategory as Category, TransactionType } from '@/types'
import { generateId } from '@/lib/utils'
import { extractPdfText, flatLines, parseJpDate, extractYearHint } from './pdf-utils'

/**
 * PayPay PDF statement parser
 *
 * Typical layout:
 *   取引日時 | 取引種別 | 取引名/加盟店名 | 金額（円）| 残高（円）
 */

const DATE_ROW_RE = /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/コンビニ|スーパー|マート|食|レストラン|カフェ|ファミマ|ローソン|セブン|吉野家|マクドナルド/.test(d)) return 'food'
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
  return amount >= 0 ? 'income' : 'expense'
}

const TYPE_KEYWORDS = ['支払い', 'チャージ', '送金', '受取', '返金', 'キャンセル', '払戻', 'ポイント']

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

    // Find amounts: rightmost number(s)
    const numMatches = [...afterDate.matchAll(/\b(\d+)\b/g)]
    if (numMatches.length === 0) continue

    // Amount is typically the first number, balance the last
    const rawAmount = parseInt(numMatches[0][1])
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
      category: guessCategory(description),
      provider: 'paypay',
      rawData: { line: text.slice(0, 120) },
    })
  }

  if (transactions.length === 0) {
    errors.push('⚠️ 取引が見つかりませんでした。抽出テキスト (先頭10行):')
    for (const l of lines.slice(0, 10)) {
      if (l.text.trim()) errors.push(`  › "${l.text.slice(0, 100)}"`)
    }
  }

  return { transactions, errors }
}
