import type { ImportResult, PaymentProvider } from '@/types'
import { parseRakutenPayCSV, decodeShiftJIS } from './rakuten-pay'
import { parsePayPayCSV } from './paypay'
import { parseRakutenPayPDF } from './rakuten-pay-pdf'
import { parsePayPayPDF } from './paypay-pdf'

export type { ImportResult }

export type FileFormat = 'csv' | 'pdf'

export function detectFormat(file: File): FileFormat {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  return 'csv'
}

export async function parseFile(
  file: File,
  provider: PaymentProvider
): Promise<ImportResult> {
  const format = detectFormat(file)

  try {
    if (format === 'pdf') {
      if (provider === 'rakuten-pay') {
        const { transactions, errors } = await parseRakutenPayPDF(file)
        return {
          success: transactions.length > 0,
          transactions,
          errors,
          fileName: file.name,
          provider,
        }
      }
      if (provider === 'paypay') {
        const { transactions, errors } = await parsePayPayPDF(file)
        return {
          success: transactions.length > 0,
          transactions,
          errors,
          fileName: file.name,
          provider,
        }
      }
    }

    // CSV path
    const buffer = await file.arrayBuffer()
    let text: string
    try {
      const decoded = new TextDecoder('shift-jis').decode(buffer)
      text = decoded.includes('�') ? new TextDecoder('utf-8').decode(buffer) : decoded
    } catch {
      text = new TextDecoder('utf-8').decode(buffer)
    }
    text = text.replace(/^﻿/, '')

    if (provider === 'rakuten-pay') {
      const { transactions, errors } = parseRakutenPayCSV(text)
      return { success: errors.length === 0, transactions, errors, fileName: file.name, provider }
    }
    if (provider === 'paypay') {
      const { transactions, errors } = parsePayPayCSV(text)
      return { success: errors.length === 0, transactions, errors, fileName: file.name, provider }
    }

    return {
      success: false,
      transactions: [],
      errors: [`未対応のプロバイダー: ${provider}`],
      fileName: file.name,
      provider,
    }
  } catch (err) {
    return {
      success: false,
      transactions: [],
      errors: [err instanceof Error ? err.message : '解析エラーが発生しました'],
      fileName: file.name,
      provider,
    }
  }
}

export { decodeShiftJIS }
