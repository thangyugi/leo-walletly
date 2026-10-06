import type { ImportResult, LegacyTransaction, ParsedImportRow, PaymentProvider } from '@/types'
import { parseRakutenPayCSV, decodeShiftJIS } from './rakuten_pay'
import { parsePayPayCSV } from './paypay'
import { parsePayPayCardCSV } from './paypay_card'
import { parseRakutenCardCSV } from './rakuten_card'
import { parseRakutenCardPages } from './rakuten_card_pdf'
import { parsePayPayPages } from './paypay_pdf'
import { extractPdfText, pdfPlainText, detectPdfKind, flatLines, PdfPasswordError } from './pdf-utils'
import { parseSMBCCSV } from './smbc'
import { parseMUFGCSV } from './mufg'
import { parseVCBCSV } from './vcb'
import { parseMBBankCSV } from './mbbank'
import { parseGenericCSV, detectColumnsFromCSV } from './generic_csv'
import type { ColumnMapping } from './generic_csv'

export type { ImportResult, ColumnMapping }
export { detectColumnsFromCSV }

export type FileFormat = 'csv' | 'pdf'

export function detectFormat(file: File): FileFormat {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  return 'csv'
}

// Auto-detect provider from CSV headers
export function autoDetectProvider(headers: string[]): PaymentProvider | null {
  const hs = headers.map((h) => h.trim().replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim().toLowerCase())
  const has = (...kws: string[]) => kws.every((k) => hs.some((h) => h.includes(k)))

  if (has('利用日時') && hs.some((h) => h.includes('利用金額'))) return 'rakuten_pay'
  if (has('取引日時') && has('残高') && hs.some((h) => h.includes('支払い金額'))) return 'paypay'
  // PayPay's English-language export (Date & Time, Amount Outgoing (Yen), ...)
  if (has('date & time') && has('amount outgoing (yen)')) return 'paypay'
  if (hs.some((h) => h.includes('利用日/キャンセル日')) || (has('利用店名') && has('支払区分'))) return 'paypay_card'
  // 楽天カード (e-NAVI): 利用日 + 利用店名・商品名 + 支払方法
  if (has('利用店名・商品名') && has('支払方法') && hs.some((h) => h === '利用日')) return 'rakuten_card'
  if (hs.some((h) => h.includes('お取り扱い内容') || h.includes('お支払い金額'))) return 'smbc'
  if (has('摘要内容') && has('支払い金額')) return 'mufg'
  if (hs.some((h) => h.includes('ngày gd') || h.includes('phát sinh'))) return 'vcb'
  if (hs.some((h) => h.includes('ngày giao dịch'))) return 'mbbank'

  return null
}

async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes  = new Uint8Array(buffer)
  const hasUtf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
  let text: string
  if (hasUtf8Bom) {
    text = new TextDecoder('utf-8').decode(buffer)
  } else {
    const sjis = new TextDecoder('shift-jis').decode(buffer)
    text = sjis.includes('') ? new TextDecoder('utf-8').decode(buffer) : sjis
  }
  return text.replace(/^﻿/, '') // strip BOM
}

/** Legacy parser output → ParsedImportRow (positive amount + type, raw cells kept). A parser's 'transfer' is a top-up between own accounts. */
function toRows(legacy: LegacyTransaction[]): ParsedImportRow[] {
  return legacy
    .filter((tx) => tx.amount !== 0 && tx.date)
    .map((tx, i) => {
      const raw = (tx.rawData && typeof tx.rawData === 'object' ? tx.rawData : {}) as Record<string, unknown>
      const values = Object.entries(raw).map(([name, value]) => ({ name, value: value == null ? '' : String(value) }))
      return {
        rowNumber: i + 1,
        date: tx.date.slice(0, 10),
        amount: Math.abs(tx.amount),
        // Only top-ups stay transfers; refunds, sends etc. count by their sign.
        ...(tx.type === 'transfer'
          ? { type: 'transfer' as const, direction: tx.amount >= 0 ? 'in' as const : 'out' as const }
          : { type: tx.amount >= 0 ? 'income' as const : 'expense' as const }),
        description: tx.description || '—',
        rawLine: values.map((v) => v.value).join(','),
        values,
      }
    })
}

/**
 * A PDF: read its text once, recognise the statement by its own words
 * (楽天カード… / PayPay), parse it with that parser. When nothing comes out,
 * say why (password, unknown kind, recognised but no rows) and show the first
 * lines read, so a new layout can be supported quickly.
 */
async function parsePdf(file: File, password?: string): Promise<ImportResult> {
  const base = { success: false, rows: [] as ParsedImportRow[], fileName: file.name, provider: 'generic_csv' as PaymentProvider }
  let pages
  try {
    pages = await extractPdfText(file, password)
  } catch (e) {
    if (e instanceof PdfPasswordError) return { ...base, errors: [], errorCode: e.wrongPassword ? 'pdf_password_wrong' : 'pdf_password' }
    return { ...base, errors: [e instanceof Error ? e.message : String(e)], errorCode: 'pdf_read' }
  }
  const text = pdfPlainText(pages)
  const preview = flatLines(pages).map((l) => l.text).filter((l) => l.trim()).slice(0, 25)
  const kind = detectPdfKind(text)

  if (kind === 'paypay_card') return { ...base, errors: [], errorCode: 'pdf_unsupported', detected: 'paypay_card', preview }
  // Only a recognised statement is parsed: guessing would file the rows under the wrong card.
  if (kind) {
    const res = kind === 'rakuten_card' ? parseRakutenCardPages(pages) : parsePayPayPages(pages)
    if (res.transactions.length > 0) {
      return { success: true, rows: toRows(res.transactions), errors: res.errors, fileName: file.name, provider: kind, detected: kind }
    }
  }
  if (!text.trim()) return { ...base, errors: [], errorCode: 'pdf_read', preview }
  return { ...base, errors: [], errorCode: kind ? 'pdf_no_rows' : 'pdf_unknown', detected: kind, preview }
}

export async function parseFile(
  file: File,
  provider: PaymentProvider,
  genericMapping?: Partial<ColumnMapping>,
  pdfPassword?: string,
): Promise<ImportResult> {
  const format = detectFormat(file)

  try {
    if (format === 'pdf') return await parsePdf(file, pdfPassword)

    const text = await readFileText(file)

    const parsers: Partial<Record<PaymentProvider, (t: string) => { transactions: LegacyTransaction[]; errors: string[] }>> = {
      'rakuten_pay': parseRakutenPayCSV,
      'paypay':      parsePayPayCSV,
      'paypay_card': parsePayPayCardCSV,
      'rakuten_card': parseRakutenCardCSV,
      'smbc':        parseSMBCCSV,
      'mufg':        parseMUFGCSV,
      'vcb':         parseVCBCSV,
      'mbbank':      parseMBBankCSV,
    }

    if (provider === 'generic_csv') {
      const { transactions, errors } = parseGenericCSV(text, genericMapping)
      return { success: transactions.length > 0, rows: toRows(transactions), errors, fileName: file.name, provider }
    }

    const parser = parsers[provider]
    if (parser) {
      const { transactions, errors } = parser(text)
      return { success: errors.length === 0 || transactions.length > 0, rows: toRows(transactions), errors, fileName: file.name, provider }
    }

    return {
      success: false, rows: [], fileName: file.name, provider,
      errors: [`未対応のプロバイダー: ${provider}`],
    }
  } catch (err) {
    return {
      success: false, rows: [],
      errors: [err instanceof Error ? err.message : '解析エラーが発生しました'],
      fileName: file.name,
      provider,
    }
  }
}

export { decodeShiftJIS }
