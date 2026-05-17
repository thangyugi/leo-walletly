import Papa from 'papaparse'
import type { LegacyTransaction as Transaction, LegacyCategory as Category } from '@/types'
import { generateId } from '@/lib/utils'

// MB Bank CSV / Excel export
// Columns: Ngày giao dịch | Số tài khoản | Mô tả | Số tiền giao dịch | Số dư

const DATE_KEYS   = ['Ngày giao dịch', 'Ngày GD', 'Transaction Date', 'Ngày']
const DESC_KEYS   = ['Mô tả', 'Diễn giải', 'Description', 'Nội dung']
const DEBIT_KEYS  = ['Số tiền giao dịch (Nợ)', 'Tiền ra', 'Debit', 'Ghi nợ']
const CREDIT_KEYS = ['Số tiền giao dịch (Có)', 'Tiền vào', 'Credit', 'Ghi có']
const AMOUNT_KEYS = ['Số tiền giao dịch', 'Số tiền', 'Amount']

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) if (row[k] !== undefined) return row[k].trim()
  return ''
}

function parseDMY(raw: string): string {
  const match = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (!match) return ''
  const [, d, m, y] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseVND(s: string): number | null {
  // MB Bank sometimes uses comma as decimal — strip commas if > 3 digits follow
  const cleaned = s.replace(/[₫đ\s]/g, '').replace(/,/g, '').trim()
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/ăn|uống|food|grab food|baemin|shopee food|nhà hàng|quán/.test(d)) return 'food'
  if (/grab|taxi|xe|bus|metro|xăng|vé tàu|tàu|bay|máy bay/.test(d)) return 'transport'
  if (/shopee|lazada|tiki|sendo|mua|shop|siêu thị/.test(d)) return 'shopping'
  if (/netflix|spotify|game|phim|giải trí|karaoke/.test(d)) return 'entertainment'
  if (/thuốc|bệnh viện|khám|phòng khám|sức khỏe|gym/.test(d)) return 'health'
  if (/điện|nước|gas|internet|wifi|điện thoại|viettel|vnpt|mobifone/.test(d)) return 'utilities'
  return 'other'
}

export function parseMBBankCSV(text: string): { transactions: Transaction[]; errors: string[] } {
  const errors: string[] = []
  const transactions: Transaction[] = []

  const lines = text.split('\n')
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (DATE_KEYS.some((k) => lines[i].includes(k))) { headerIdx = i; break }
  }
  if (headerIdx < 0) {
    errors.push('Không tìm thấy hàng tiêu đề. Cột mong đợi: ' + DATE_KEYS.join(' / '))
    return { transactions, errors }
  }

  const result = Papa.parse<Record<string, string>>(lines.slice(headerIdx).join('\n'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^﻿/, ''),
    transform: (v) => v.trim(),
  })

  for (const row of result.data) {
    const dateRaw   = pick(row, DATE_KEYS)
    const desc      = pick(row, DESC_KEYS)
    const debitRaw  = pick(row, DEBIT_KEYS)
    const creditRaw = pick(row, CREDIT_KEYS)
    const amountRaw = pick(row, AMOUNT_KEYS)

    if (!dateRaw) continue
    const date = parseDMY(dateRaw)
    if (!date) { errors.push(`Ngày không hợp lệ: "${dateRaw}"`); continue }

    let amount: number
    if (debitRaw || creditRaw) {
      const debit  = parseVND(debitRaw)
      const credit = parseVND(creditRaw)
      if ((debit ?? 0) === 0 && (credit ?? 0) === 0) continue
      amount = credit !== null && credit > 0 ? credit : -(debit ?? 0)
    } else {
      const raw = parseVND(amountRaw)
      if (raw === null) continue
      amount = raw
    }

    transactions.push({
      id: generateId(),
      date,
      description: desc || 'MB Bank',
      amount,
      type: amount >= 0 ? 'income' : 'expense',
      category: guessCategory(desc),
      provider: 'mbbank',
      rawData: { date: dateRaw, desc, amount: amountRaw || debitRaw || creditRaw },
    })
  }

  if (transactions.length === 0) {
    errors.push('Không tìm thấy giao dịch. Tiêu đề: ' + (result.meta.fields ?? []).join(', '))
  }

  return { transactions, errors }
}
