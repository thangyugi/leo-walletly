import Papa from 'papaparse'
import type { LegacyTransaction as Transaction, LegacyCategory as Category } from '@/types'
import { generateId } from '@/lib/utils'

// Vietcombank CSV export
// Columns: Ngày GD | Ngày hiệu lực | Mã GD | Mô tả | Số tiền | Số dư
// Alternative: Ngày giao dịch | Mã giao dịch | Nội dung | Phát sinh nợ | Phát sinh có | Số dư

const DATE_KEYS   = ['Ngày GD', 'Ngày giao dịch', 'Ngày']
const DESC_KEYS   = ['Mô tả', 'Nội dung', 'Diễn giải']
const AMOUNT_KEYS = ['Số tiền', 'Phát sinh']
const DEBIT_KEYS  = ['Phát sinh nợ', 'Tiền ra', 'Ghi nợ']
const CREDIT_KEYS = ['Phát sinh có', 'Tiền vào', 'Ghi có']

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) if (row[k] !== undefined) return row[k].trim()
  return ''
}

// Parse DD/MM/YYYY or DD/MM/YYYY HH:MM:SS → YYYY-MM-DD
function parseDMY(raw: string): string {
  const match = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (!match) return ''
  const [, d, m, y] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseVND(s: string): number | null {
  const cleaned = s.replace(/[₫đ,.\s]/g, '').trim()
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

export function parseVCBCSV(text: string): { transactions: Transaction[]; errors: string[] } {
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
    const amountRaw = pick(row, AMOUNT_KEYS)
    const debitRaw  = pick(row, DEBIT_KEYS)
    const creditRaw = pick(row, CREDIT_KEYS)

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
      description: desc || 'Vietcombank',
      amount,
      type: amount >= 0 ? 'income' : 'expense',
      category: guessCategory(desc),
      provider: 'vcb',
      rawData: { date: dateRaw, desc, amount: amountRaw || debitRaw || creditRaw },
    })
  }

  if (transactions.length === 0) {
    errors.push('Không tìm thấy giao dịch. Tiêu đề: ' + (result.meta.fields ?? []).join(', '))
  }

  return { transactions, errors }
}
