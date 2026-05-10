import type { ImportResult, PaymentProvider } from '@/types'
import { parseRakutenPayCSV, decodeShiftJIS } from './rakuten-pay'
import { parsePayPayCSV } from './paypay'
import { parsePayPayCardCSV } from './paypay-card'
import { parseRakutenPayPDF } from './rakuten-pay-pdf'
import { parsePayPayPDF } from './paypay-pdf'
import { parseSMBCCSV } from './smbc'
import { parseMUFGCSV } from './mufg'
import { parseVCBCSV } from './vcb'
import { parseMBBankCSV } from './mbbank'
import { parseGenericCSV, detectColumnsFromCSV } from './generic-csv'
import type { ColumnMapping } from './generic-csv'

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
  const hs = headers.map((h) => h.toLowerCase())
  const has = (...kws: string[]) => kws.every((k) => hs.some((h) => h.includes(k)))

  // Rakuten Pay: has "利用日時" and "利用金額(円)"
  if (has('利用日時') && hs.some((h) => h.includes('利用金額'))) return 'rakuten-pay'
  // PayPay: has "取引日時" and "残高"
  if (has('取引日時') && has('残高') && hs.some((h) => h.includes('支払い金額'))) return 'paypay'
  // PayPay Card: has "利用日/キャンセル日" and "利用店名"
  if (hs.some((h) => h.includes('利用日/キャンセル日')) || (has('利用店名') && has('支払区分'))) return 'paypay-card'
  // SMBC: has "お取り扱い内容" or "お支払い金額"
  if (hs.some((h) => h.includes('お取り扱い内容') || h.includes('お支払い金額'))) return 'smbc'
  // MUFG: has "摘要内容" and "支払い金額"
  if (has('摘要内容') && has('支払い金額')) return 'mufg'
  // VCB: has "ngày gd" or "mô tả" (Vietnamese)
  if (hs.some((h) => h.includes('ngày gd') || h.includes('phát sinh'))) return 'vcb'
  // MBBank: has "ngày giao dịch"
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
    text = sjis.includes('�') ? new TextDecoder('utf-8').decode(buffer) : sjis
  }
  return text.replace(/^﻿/, '') // strip BOM
}

export async function parseFile(
  file: File,
  provider: PaymentProvider,
  genericMapping?: Partial<ColumnMapping>
): Promise<ImportResult> {
  const format = detectFormat(file)

  try {
    // --- PDF ---
    if (format === 'pdf') {
      if (provider === 'rakuten-pay') {
        const { transactions, errors } = await parseRakutenPayPDF(file)
        return { success: transactions.length > 0, transactions, errors, fileName: file.name, provider }
      }
      if (provider === 'paypay') {
        const { transactions, errors } = await parsePayPayPDF(file)
        return { success: transactions.length > 0, transactions, errors, fileName: file.name, provider }
      }
      return {
        success: false, transactions: [], fileName: file.name, provider,
        errors: ['PDFは楽天PayとPayPayのみ対応しています。'],
      }
    }

    // --- CSV ---
    const text = await readFileText(file)

    const parsers: Partial<Record<PaymentProvider, (t: string) => { transactions: any[]; errors: string[] }>> = {
      'rakuten-pay': parseRakutenPayCSV,
      'paypay':      parsePayPayCSV,
      'paypay-card': parsePayPayCardCSV,
      'smbc':        parseSMBCCSV,
      'mufg':        parseMUFGCSV,
      'vcb':         parseVCBCSV,
      'mbbank':      parseMBBankCSV,
    }

    if (provider === 'generic-csv') {
      const { transactions, errors } = parseGenericCSV(text, genericMapping)
      return { success: transactions.length > 0, transactions, errors, fileName: file.name, provider }
    }

    const parser = parsers[provider]
    if (parser) {
      const { transactions, errors } = parser(text)
      return { success: errors.length === 0 || transactions.length > 0, transactions, errors, fileName: file.name, provider }
    }

    return {
      success: false, transactions: [], fileName: file.name, provider,
      errors: [`未対応のプロバイダー: ${provider}`],
    }
  } catch (err) {
    return {
      success: false, transactions: [],
      errors: [err instanceof Error ? err.message : '解析エラーが発生しました'],
      fileName: file.name,
      provider,
    }
  }
}

export { decodeShiftJIS }
