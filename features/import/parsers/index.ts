import type { ImportResult, PaymentProvider } from '@/types'
import { parseRakutenPayCSV, decodeShiftJIS } from './rakuten-pay'
import { parsePayPayCSV } from './paypay'

export type { ImportResult }

export async function parseFile(
  file: File,
  provider: PaymentProvider
): Promise<ImportResult> {
  const buffer = await file.arrayBuffer()

  // Decode: try Shift-JIS first (common for Japanese CSVs), fallback to UTF-8
  let text: string
  try {
    const decoded = new TextDecoder('shift-jis').decode(buffer)
    // Heuristic: if decoded text contains mojibake-like chars, fallback to UTF-8
    text = decoded.includes('') ? new TextDecoder('utf-8').decode(buffer) : decoded
  } catch {
    text = new TextDecoder('utf-8').decode(buffer)
  }

  // Remove BOM if present
  text = text.replace(/^﻿/, '')

  try {
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
