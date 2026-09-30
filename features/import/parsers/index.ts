import type { ImportResult, LegacyTransaction, ParsedImportRow, PaymentProvider } from '@/types'
import { parseRakutenPayCSV, decodeShiftJIS } from './rakuten_pay'
import { parsePayPayCSV } from './paypay'
import { parsePayPayCardCSV } from './paypay_card'
import { parseRakutenCardCSV } from './rakuten_card'
import { parseRakutenCardPDF } from './rakuten_card_pdf'
import { parsePayPayPDF } from './paypay_pdf'
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

/** Legacy parser output → ParsedImportRow (positive amount + type, raw cells kept). */
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
        type: tx.amount >= 0 ? 'income' : 'expense',
        description: tx.description || '—',
        rawLine: values.map((v) => v.value).join(','),
        values,
      }
    })
}

export async function parseFile(
  file: File,
  provider: PaymentProvider,
  genericMapping?: Partial<ColumnMapping>
): Promise<ImportResult> {
  const format = detectFormat(file)

  try {
    if (format === 'pdf') {
      try {
        const rakutenRes = await parseRakutenCardPDF(file)
        if (rakutenRes.transactions.length > 0) {
          return { success: true, rows: toRows(rakutenRes.transactions), errors: rakutenRes.errors, fileName: file.name, provider: 'rakuten_card' }
        }
      } catch (e) {
        // ignore and try next
      }
      
      try {
        const paypayRes = await parsePayPayPDF(file)
        if (paypayRes.transactions.length > 0) {
          return { success: true, rows: toRows(paypayRes.transactions), errors: paypayRes.errors, fileName: file.name, provider: 'paypay' }
        }
      } catch (e) {
        // ignore
      }

      return {
        success: false, rows: [], fileName: file.name, provider: 'generic_csv',
        errors: ['PDFの解析に失敗しました。対応しているのは楽天カードとPayPayの利用明細のみです。'],
      }
    }

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
