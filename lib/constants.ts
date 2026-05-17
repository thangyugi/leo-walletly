import type {
  Category, PaymentProvider,
  ExpenseScope, AllocationType, ParticipantRole, RelationshipType,
  SettlementType, PaymentInstrumentType, FundingSourceType,
  FinancialAccountType, TransactionType, BusinessEventType,
  TransactionStatus, ImportMatchType, OcrStatus,
  ReconciliationStatus, CategoryType, ImportProvider,
  LegacyCategory,
} from '@/types'

export const APP_NAME = 'Leo Walletly'

export const CATEGORIES: { value: LegacyCategory; label: string; emoji: string }[] = [
  { value: 'food', label: '食費', emoji: '🍜' },
  { value: 'transport', label: '交通', emoji: '🚃' },
  { value: 'shopping', label: '買い物', emoji: '🛍️' },
  { value: 'entertainment', label: '娯楽', emoji: '🎮' },
  { value: 'health', label: '医療・健康', emoji: '💊' },
  { value: 'utilities', label: '光熱費', emoji: '💡' },
  { value: 'other', label: 'その他', emoji: '📦' },
]

export type ProviderRegion = 'jp' | 'vn' | 'global'

export interface ProviderMeta {
  value: PaymentProvider
  label: string
  color: string
  initials: string
  region: ProviderRegion
  fileTypes: ('csv' | 'pdf')[]
  descJa: string
  descVi: string
  descEn: string
}

export const PROVIDERS: ProviderMeta[] = [
  {
    value: 'rakuten_pay', label: 'Rakuten Pay', color: '#BF0000', initials: 'RP',
    region: 'jp', fileTypes: ['csv', 'pdf'],
    descJa: '極楽ペイ 取引明細 CSV / PDF',
    descVi: 'Lịch sử giao dịch Rakuten Pay CSV / PDF',
    descEn: 'Rakuten Pay transaction history CSV / PDF',
  },
  {
    value: 'paypay', label: 'PayPay', color: '#FF0033', initials: 'PP',
    region: 'jp', fileTypes: ['csv', 'pdf'],
    descJa: 'PayPay 取引履歴 CSV / PDF',
    descVi: 'Lịch sử giao dịch PayPay CSV / PDF',
    descEn: 'PayPay transaction history CSV / PDF',
  },
  {
    value: 'paypay_card', label: 'PayPayカード', color: '#8B1AFF', initials: 'PC',
    region: 'jp', fileTypes: ['csv'],
    descJa: 'PayPayクレジットカード明細 CSV',
    descVi: 'Sao kê thẻ PayPay CSV',
    descEn: 'PayPay Credit Card statement CSV',
  },
  {
    value: 'smbc', label: '三井住友銀行', color: '#00A040', initials: 'SM',
    region: 'jp', fileTypes: ['csv'],
    descJa: '三井住友銀行 口座明細 CSV',
    descVi: 'Sao kê tài khoản Sumitomo Mitsui CSV',
    descEn: 'SMBC bank account statement CSV',
  },
  {
    value: 'mufg', label: '三菱UFJ銀行', color: '#D40000', initials: 'MU',
    region: 'jp', fileTypes: ['csv'],
    descJa: '三菱UFJ銀行 口座明細 CSV',
    descVi: 'Sao kê tài khoản MUFG CSV',
    descEn: 'MUFG bank account statement CSV',
  },
  {
    value: 'vcb', label: 'Vietcombank', color: '#007A3D', initials: 'VB',
    region: 'vn', fileTypes: ['csv'],
    descJa: 'Vietcombank 口座明細 CSV',
    descVi: 'Sao kê tài khoản Vietcombank CSV',
    descEn: 'Vietcombank bank account statement CSV',
  },
  {
    value: 'mbbank', label: 'MB Bank', color: '#8B0000', initials: 'MB',
    region: 'vn', fileTypes: ['csv'],
    descJa: 'MB Bank 口座明細 CSV',
    descVi: 'Lịch sử giao dịch MB Bank CSV',
    descEn: 'MB Bank transaction history CSV',
  },
  {
    value: 'generic_csv', label: 'CSV汎用', color: '#6366F1', initials: 'GC',
    region: 'global', fileTypes: ['csv'],
    descJa: '任意のCSV（列を自動検出）',
    descVi: 'CSV bất kỳ (tự động nhận diện cột)',
    descEn: 'Any CSV file (auto-detect columns)',
  },
  {
    value: 'manual', label: '手動入力', color: '#0d9159', initials: 'MT',
    region: 'global', fileTypes: [],
    descJa: '手動で取引を入力',
    descVi: 'Nhập giao dịch thủ công',
    descEn: 'Manually entered transaction',
  },
  {
    value: 'ai_scan', label: 'AI Scan', color: '#3b82f6', initials: 'AI',
    region: 'global', fileTypes: [],
    descJa: 'AI レシートスキャン',
    descVi: 'Quét hóa đơn bằng AI',
    descEn: 'AI receipt scan',
  },
]


export const CATEGORY_COLORS: Record<LegacyCategory, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  shopping: '#a855f7',
  entertainment: '#ec4899',
  health: '#14b8a6',
  utilities: '#eab308',
  other: '#94a3b8',
}

export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#0d9159', '#64748b',
]

export const PRESET_EMOJIS = [
  '🍜', '🛍️', '🚃', '💊', '🎮', '💡', '☕', '🍺', '🏠', '✈️',
  '📱', '🛒', '🎵', '💪', '📚', '🐾', '🎁', '💰', '🏥', '⚡',
]

/* ============================================================
   ENTERPRISE FINTECH V3 — CONSTANTS
   Business Event ≠ Payment Instrument ≠ Funding Source
   ≠ Settlement ≠ Accounting Entry ≠ Expense Ownership
   ============================================================ */

// ── Expense Scope ──────────────────────────────────────────
export const EXPENSE_SCOPES: {
  value: ExpenseScope
  labelJa: string
  labelVi: string
  labelEn: string
  color: string
  emoji: string
}[] = [
  {
    value: 'personal',
    labelJa: '個人費用',
    labelVi: 'Chi phí cá nhân',
    labelEn: 'Personal',
    color: '#3b82f6',
    emoji: '👤',
  },
  {
    value: 'shared_household',
    labelJa: '世帯共有費用',
    labelVi: 'Chi phí chung hộ gia đình',
    labelEn: 'Shared Household',
    color: '#22c55e',
    emoji: '🏠',
  },
  {
    value: 'childcare',
    labelJa: '育児費用',
    labelVi: 'Chi phí nuôi con',
    labelEn: 'Childcare',
    color: '#f97316',
    emoji: '👶',
  },
  {
    value: 'business',
    labelJa: '事業費用',
    labelVi: 'Chi phí kinh doanh',
    labelEn: 'Business',
    color: '#6366f1',
    emoji: '💼',
  },
  {
    value: 'reimbursable',
    labelJa: '立替費用（精算待ち）',
    labelVi: 'Chi phí cần hoàn trả',
    labelEn: 'Reimbursable',
    color: '#eab308',
    emoji: '🔄',
  },
]

// ── Allocation Types ─────────────────────────────────────────
export const ALLOCATION_TYPES: {
  value: AllocationType
  labelJa: string
  labelVi: string
  labelEn: string
}[] = [
  { value: 'equal_split',  labelJa: '均等割り',     labelVi: 'Chia đều',             labelEn: 'Equal Split'   },
  { value: 'fixed_amount', labelJa: '固定金額',     labelVi: 'Số tiền cố định',      labelEn: 'Fixed Amount'  },
  { value: 'percentage',   labelJa: 'パーセント',   labelVi: 'Tỷ lệ phần trăm',     labelEn: 'Percentage'    },
  { value: 'weighted',     labelJa: '加重按分',     labelVi: 'Chia theo trọng số',   labelEn: 'Weighted'      },
  { value: 'formula',      labelJa: '計算式',       labelVi: 'Theo công thức',       labelEn: 'Formula'       },
]

// ── Participant Roles ─────────────────────────────────────────
export const PARTICIPANT_ROLES: {
  value: ParticipantRole
  labelJa: string
  labelVi: string
  labelEn: string
}[] = [
  { value: 'payer',         labelJa: '支払者',     labelVi: 'Người thanh toán',  labelEn: 'Payer'         },
  { value: 'beneficiary',   labelJa: '受益者',     labelVi: 'Người hưởng lợi',  labelEn: 'Beneficiary'   },
  { value: 'shared_member', labelJa: '共有メンバー', labelVi: 'Thành viên chung', labelEn: 'Shared Member' },
  { value: 'reviewer',      labelJa: '確認者',     labelVi: 'Người xem xét',    labelEn: 'Reviewer'      },
  { value: 'approver',      labelJa: '承認者',     labelVi: 'Người phê duyệt',  labelEn: 'Approver'      },
]

// ── Relationship Types ─────────────────────────────────────────
export const RELATIONSHIP_TYPES: {
  value: RelationshipType
  labelJa: string
  labelVi: string
  labelEn: string
  emoji: string
}[] = [
  { value: 'husband',     labelJa: '夫',       labelVi: 'Chồng',        labelEn: 'Husband',     emoji: '👨' },
  { value: 'wife',        labelJa: '妻',       labelVi: 'Vợ',           labelEn: 'Wife',        emoji: '👩' },
  { value: 'child',       labelJa: '子供',     labelVi: 'Con',          labelEn: 'Child',       emoji: '👦' },
  { value: 'parent',      labelJa: '親',       labelVi: 'Bố/Mẹ',       labelEn: 'Parent',      emoji: '👴' },
  { value: 'partner',     labelJa: 'パートナー', labelVi: 'Bạn đời',     labelEn: 'Partner',     emoji: '🤝' },
  { value: 'sibling',     labelJa: '兄弟姉妹', labelVi: 'Anh/Chị/Em',  labelEn: 'Sibling',     emoji: '👫' },
  { value: 'grandparent', labelJa: '祖父母',   labelVi: 'Ông/Bà',      labelEn: 'Grandparent', emoji: '👴' },
  { value: 'other',       labelJa: 'その他',   labelVi: 'Khác',         labelEn: 'Other',       emoji: '👤' },
]

// ── Settlement Types ─────────────────────────────────────────
export const SETTLEMENT_TYPES: {
  value: SettlementType
  labelJa: string
  labelVi: string
  labelEn: string
  description: string
}[] = [
  {
    value: 'prepaid',
    labelJa: 'プリペイド（先払い）',
    labelVi: 'Trả trước',
    labelEn: 'Prepaid',
    description: 'Load balance first, then spend. Examples: PASMO, WAON, Edy',
  },
  {
    value: 'postpaid',
    labelJa: 'ポストペイ（後払い）',
    labelVi: 'Trả sau',
    labelEn: 'Postpaid',
    description: 'Pay later via credit. Examples: Rakuten Pay + Rakuten Card',
  },
  {
    value: 'direct_debit',
    labelJa: '即時口座引落',
    labelVi: 'Ghi nợ trực tiếp',
    labelEn: 'Direct Debit',
    description: 'Deducted from bank account immediately',
  },
  {
    value: 'credit_settlement',
    labelJa: 'クレジット決済（月次請求）',
    labelVi: 'Thanh toán tín dụng',
    labelEn: 'Credit Settlement',
    description: 'Monthly credit card bill. Examples: QUICPay, iD',
  },
  {
    value: 'wallet_balance',
    labelJa: 'ウォレット残高',
    labelVi: 'Số dư ví điện tử',
    labelEn: 'Wallet Balance',
    description: 'Spend from app wallet. Examples: PayPay balance',
  },
]

// ── Payment Instrument Types ───────────────────────────────────
export const PAYMENT_INSTRUMENT_TYPES: {
  value: PaymentInstrumentType
  labelJa: string
  labelVi: string
  labelEn: string
  emoji: string
}[] = [
  { value: 'qr_code',             labelJa: 'QRコード決済',  labelVi: 'Thanh toán QR',         labelEn: 'QR Code Payment',    emoji: '📱' },
  { value: 'transit_card',        labelJa: '交通系 ICカード', labelVi: 'Thẻ giao thông IC',     labelEn: 'Transit IC Card',    emoji: '🚃' },
  { value: 'contactless_nfc',     labelJa: '非接触NFC',    labelVi: 'NFC không tiếp xúc',    labelEn: 'Contactless NFC',    emoji: '📡' },
  { value: 'credit_settlement',   labelJa: 'クレジット決済', labelVi: 'Thanh toán tín dụng',  labelEn: 'Credit Settlement',  emoji: '💳' },
  { value: 'bank_direct',         labelJa: '銀行直接',     labelVi: 'Ngân hàng trực tiếp',   labelEn: 'Bank Direct',        emoji: '🏦' },
  { value: 'virtual_card',        labelJa: 'バーチャルカード', labelVi: 'Thẻ ảo',             labelEn: 'Virtual Card',       emoji: '💻' },
  { value: 'barcode',             labelJa: 'バーコード決済', labelVi: 'Thanh toán mã vạch',   labelEn: 'Barcode Payment',    emoji: '📊' },
  { value: 'app_wallet',          labelJa: 'アプリウォレット', labelVi: 'Ví ứng dụng',        labelEn: 'App Wallet',         emoji: '👛' },
  { value: 'prepaid_card',        labelJa: 'プリペイドカード', labelVi: 'Thẻ trả trước',      labelEn: 'Prepaid Card',       emoji: '🃏' },
]

// ── Funding Source Types ────────────────────────────────────────
export const FUNDING_SOURCE_TYPES: {
  value: FundingSourceType
  labelJa: string
  labelVi: string
  labelEn: string
  emoji: string
}[] = [
  { value: 'bank_account',     labelJa: '銀行口座',       labelVi: 'Tài khoản ngân hàng', labelEn: 'Bank Account',     emoji: '🏦' },
  { value: 'credit_card',      labelJa: 'クレジットカード', labelVi: 'Thẻ tín dụng',       labelEn: 'Credit Card',      emoji: '💳' },
  { value: 'e_wallet_balance', labelJa: '電子マネー残高',  labelVi: 'Số dư ví điện tử',   labelEn: 'E-Wallet Balance', emoji: '👛' },
  { value: 'prepaid_balance',  labelJa: 'プリペイド残高',  labelVi: 'Số dư trả trước',    labelEn: 'Prepaid Balance',  emoji: '🃏' },
  { value: 'cash',             labelJa: '現金',           labelVi: 'Tiền mặt',           labelEn: 'Cash',             emoji: '💴' },
  { value: 'points_balance',   labelJa: 'ポイント残高',    labelVi: 'Số dư điểm thưởng',  labelEn: 'Points Balance',   emoji: '⭐' },
  { value: 'crypto',           labelJa: '暗号資産',        labelVi: 'Tiền mã hóa',        labelEn: 'Cryptocurrency',   emoji: '₿' },
  { value: 'investment',       labelJa: '投資口座',        labelVi: 'Tài khoản đầu tư',   labelEn: 'Investment',       emoji: '📈' },
]

// ── Financial Account Types ───────────────────────────────────────
export const FINANCIAL_ACCOUNT_TYPES: {
  value: FinancialAccountType
  labelJa: string
  labelVi: string
  labelEn: string
  emoji: string
}[] = [
  { value: 'bank',        labelJa: '銀行口座',         labelVi: 'Ngân hàng',        labelEn: 'Bank Account', emoji: '🏦' },
  { value: 'credit_card', labelJa: 'クレジットカード', labelVi: 'Thẻ tín dụng',    labelEn: 'Credit Card',  emoji: '💳' },
  { value: 'e_wallet',    labelJa: '電子マネー',       labelVi: 'Ví điện tử',      labelEn: 'E-Wallet',     emoji: '👛' },
  { value: 'cash',        labelJa: '現金',             labelVi: 'Tiền mặt',        labelEn: 'Cash',         emoji: '💴' },
  { value: 'investment',  labelJa: '投資口座',         labelVi: 'Đầu tư',          labelEn: 'Investment',   emoji: '📈' },
  { value: 'crypto',      labelJa: '暗号資産',         labelVi: 'Tiền mã hóa',     labelEn: 'Crypto',       emoji: '₿' },
  { value: 'prepaid',     labelJa: 'プリペイドカード', labelVi: 'Thẻ trả trước',   labelEn: 'Prepaid Card', emoji: '🃏' },
]

// ── Transaction Types V3 ───────────────────────────────────────
export const TRANSACTION_TYPES_V3: {
  value: TransactionType
  labelJa: string
  labelVi: string
  labelEn: string
  note?: string
}[] = [
  { value: 'expense',        labelJa: '支出',     labelVi: 'Chi tiêu',         labelEn: 'Expense'                              },
  { value: 'income',         labelJa: '収入',     labelVi: 'Thu nhập',         labelEn: 'Income'                               },
  { value: 'transfer',       labelJa: '振替',     labelVi: 'Chuyển khoản',     labelEn: 'Transfer'                             },
  { value: 'refund',         labelJa: '返金',     labelVi: 'Hoàn tiền',        labelEn: 'Refund'                               },
  {
    value: 'asset_transfer',
    labelJa: '資産移動',
    labelVi: 'Chuyển tài sản',
    labelEn: 'Asset Transfer',
    note: 'PASMO/Suica charge — NOT an expense',
  },
]

// ── Transaction Statuses ────────────────────────────────────────
export const TRANSACTION_STATUSES: {
  value: TransactionStatus
  labelJa: string
  labelVi: string
  labelEn: string
  color: string
}[] = [
  { value: 'draft',       labelJa: '下書き',   labelVi: 'Nháp',           labelEn: 'Draft',       color: '#94a3b8' },
  { value: 'pending',     labelJa: '保留中',   labelVi: 'Chờ xử lý',     labelEn: 'Pending',     color: '#eab308' },
  { value: 'posted',      labelJa: '記帳済み', labelVi: 'Đã ghi sổ',     labelEn: 'Posted',      color: '#22c55e' },
  { value: 'voided',      labelJa: '無効',     labelVi: 'Hủy bỏ',        labelEn: 'Voided',      color: '#ef4444' },
  { value: 'reversed',    labelJa: '取消済み', labelVi: 'Đã đảo ngược',  labelEn: 'Reversed',    color: '#8b5cf6' },
  { value: 'reconciled',  labelJa: '照合済み', labelVi: 'Đã đối soát',   labelEn: 'Reconciled',  color: '#0ea5e9' },
]

// ── Import Match Types ────────────────────────────────────────
export const IMPORT_MATCH_TYPES: {
  value: ImportMatchType
  labelJa: string
  labelVi: string
  labelEn: string
  severity: 'info' | 'warning' | 'success'
}[] = [
  { value: 'duplicate',           labelJa: '重複',              labelVi: 'Trùng lặp',                    labelEn: 'Duplicate',          severity: 'warning' },
  { value: 'possible_duplicate',  labelJa: '重複の可能性',      labelVi: 'Có thể trùng lặp',            labelEn: 'Possible Duplicate',  severity: 'warning' },
  { value: 'settlement_match',    labelJa: '決済照合',          labelVi: 'Khớp quyết toán',             labelEn: 'Settlement Match',    severity: 'info'    },
  { value: 'wallet_match',        labelJa: 'ウォレット照合',    labelVi: 'Khớp ví điện tử',             labelEn: 'Wallet Match',        severity: 'info'    },
  { value: 'transfer_match',      labelJa: '振替照合',          labelVi: 'Khớp chuyển khoản nội bộ',   labelEn: 'Transfer Match',      severity: 'info'    },
  { value: 'refund_match',        labelJa: '返金照合',          labelVi: 'Khớp hoàn tiền',              labelEn: 'Refund Match',        severity: 'success' },
]

// ── Import Providers V3 ────────────────────────────────────────
export interface ImportProviderMeta {
  value: ImportProvider
  label: string
  color: string
  initials: string
  region: 'jp' | 'vn' | 'global'
  fileTypes: ('csv' | 'pdf')[]
  descJa: string
  descVi: string
  descEn: string
  paymentRail?: string       // links to payment_instruments.provider
  isTransitCard?: boolean
}

export const IMPORT_PROVIDERS_V3: ImportProviderMeta[] = [
  {
    value: 'rakuten_pay', label: 'Rakuten Pay', color: '#BF0000', initials: 'RP',
    region: 'jp', fileTypes: ['csv', 'pdf'],
    descJa: '極楽ペイ 取引明細 CSV / PDF',
    descVi: 'Lịch sử giao dịch Rakuten Pay CSV / PDF',
    descEn: 'Rakuten Pay transaction history CSV / PDF',
    paymentRail: 'rakuten_pay',
  },
  {
    value: 'paypay', label: 'PayPay', color: '#FF0033', initials: 'PP',
    region: 'jp', fileTypes: ['csv', 'pdf'],
    descJa: 'PayPay 取引履歴 CSV / PDF',
    descVi: 'Lịch sử giao dịch PayPay CSV / PDF',
    descEn: 'PayPay transaction history CSV / PDF',
    paymentRail: 'paypay',
  },
  {
    value: 'paypay_card', label: 'PayPayカード', color: '#8B1AFF', initials: 'PC',
    region: 'jp', fileTypes: ['csv'],
    descJa: 'PayPayクレジットカード明細 CSV',
    descVi: 'Sao kê thẻ PayPay CSV',
    descEn: 'PayPay Credit Card statement CSV',
  },
  {
    value: 'smbc', label: '三井住友銀行', color: '#00A040', initials: 'SM',
    region: 'jp', fileTypes: ['csv'],
    descJa: '三井住友銀行 口座明細 CSV',
    descVi: 'Sao kê tài khoản Sumitomo Mitsui CSV',
    descEn: 'SMBC bank account statement CSV',
  },
  {
    value: 'mufg', label: '三菱UFJ銀行', color: '#D40000', initials: 'MU',
    region: 'jp', fileTypes: ['csv'],
    descJa: '三菱UFJ銀行 口座明細 CSV',
    descVi: 'Sao kê tài khoản MUFG CSV',
    descEn: 'MUFG bank account statement CSV',
  },
  {
    value: 'rakuten_bank', label: '極楽銀行', color: '#BF0000', initials: 'RB',
    region: 'jp', fileTypes: ['csv'],
    descJa: '極楽銀行 口座明細 CSV',
    descVi: 'Sao kê Rakuten Bank CSV',
    descEn: 'Rakuten Bank account statement CSV',
  },
  {
    value: 'vcb', label: 'Vietcombank', color: '#007A3D', initials: 'VB',
    region: 'vn', fileTypes: ['csv'],
    descJa: 'Vietcombank 口座明細 CSV',
    descVi: 'Sao kê tài khoản Vietcombank CSV',
    descEn: 'Vietcombank bank account statement CSV',
  },
  {
    value: 'mbbank', label: 'MB Bank', color: '#8B0000', initials: 'MB',
    region: 'vn', fileTypes: ['csv'],
    descJa: 'MB Bank 口座明細 CSV',
    descVi: 'Lịch sử giao dịch MB Bank CSV',
    descEn: 'MB Bank transaction history CSV',
  },
  {
    value: 'generic_csv', label: 'CSV汎用', color: '#6366F1', initials: 'GC',
    region: 'global', fileTypes: ['csv'],
    descJa: '任意のCSV（列を自動検出）',
    descVi: 'CSV bất kỳ (tự động nhận diện cột)',
    descEn: 'Any CSV file (auto-detect columns)',
  },
  {
    value: 'pdf_bank_statement', label: 'PDF明細', color: '#ef4444', initials: 'PD',
    region: 'global', fileTypes: ['pdf'],
    descJa: 'PDF銀行明細（OCR処理）',
    descVi: 'Sao kê PDF (OCR)',
    descEn: 'PDF bank statement (OCR)',
  },
  {
    value: 'manual', label: '手動入力', color: '#0d9159', initials: 'MT',
    region: 'global', fileTypes: [],
    descJa: '手動で取引を入力',
    descVi: 'Nhập giao dịch thủ công',
    descEn: 'Manually entered transaction',
  },
]

// ── Japanese Payment Ecosystem (Reference) ─────────────────────
/**
 * Japanese fintech payment flows for settlement matching:
 *
 * Rakuten Pay:
 *   Rail = Rakuten Pay
 *   Funding = Rakuten Credit Card | Rakuten Point | Rakuten Bank
 *   Settlement = Monthly credit bill
 *
 * PayPay:
 *   Rail = PayPay
 *   Funding = PayPay Balance | PayPay Credit | Bank | Credit Card
 *   (priority_order determines which funding is charged first)
 *
 * PASMO / Suica charge:
 *   Type = asset_transfer (NOT expense!)
 *   Journal: Debit PASMO Prepaid Asset / Credit Bank Account
 *
 * QUICPay / iD:
 *   Rail = QUICPay or iD NFC
 *   Funding = linked credit card (JCB, VISA, etc.)
 *   Settlement = credit_settlement
 */
export const JAPANESE_PAYMENT_FLOWS = {
  RAKUTEN_PAY: {
    rail: 'rakuten_pay',
    fundingSources: ['rakuten_credit', 'rakuten_point', 'rakuten_bank'],
    settlementType: 'credit_settlement' as SettlementType,
    statementMatchKey: 'rakuten_card',
  },
  PAYPAY: {
    rail: 'paypay',
    fundingSources: ['paypay_balance', 'paypay_credit', 'bank', 'credit_card'],
    priorityDefault: 'paypay_balance',
    settlementType: 'wallet_balance' as SettlementType,
  },
  PASMO: {
    rail: 'pasmo',
    isTransitCard: true,
    chargeType: 'asset_transfer' as TransactionType,
    note: 'Charge = asset_transfer. Spend = expense with payment_instrument = PASMO',
  },
  SUICA: {
    rail: 'suica',
    isTransitCard: true,
    chargeType: 'asset_transfer' as TransactionType,
    note: 'Same as PASMO — IC card prepaid top-up is NOT an expense',
  },
} as const

// ── Business Event Types ───────────────────────────────────────
export const BUSINESS_EVENT_TYPES: {
  value: BusinessEventType
  labelJa: string
  labelVi: string
  labelEn: string
}[] = [
  { value: 'purchase',         labelJa: '購入',          labelVi: 'Mua hàng',         labelEn: 'Purchase'         },
  { value: 'subscription',     labelJa: 'サブスクリプション', labelVi: 'Đăng ký dịch vụ', labelEn: 'Subscription'     },
  { value: 'salary',           labelJa: '給与',          labelVi: 'Lương',            labelEn: 'Salary'           },
  { value: 'dividend',         labelJa: '配当',          labelVi: 'Cổ tức',           labelEn: 'Dividend'         },
  { value: 'loan_repayment',   labelJa: 'ローン返済',    labelVi: 'Trả nợ vay',       labelEn: 'Loan Repayment'   },
  { value: 'rent',             labelJa: '家賎',          labelVi: 'Tiền thuê nhà',    labelEn: 'Rent'             },
  { value: 'utility',          labelJa: '公共料金',      labelVi: 'Tiện ích',         labelEn: 'Utility'          },
  { value: 'insurance',        labelJa: '保険',          labelVi: 'Bảo hiểm',        labelEn: 'Insurance'        },
  { value: 'tax',              labelJa: '税金',          labelVi: 'Thuế',             labelEn: 'Tax'              },
  { value: 'reimbursement',    labelJa: '立替精算',      labelVi: 'Hoàn trả chi phí', labelEn: 'Reimbursement'    },
  { value: 'gift',             labelJa: 'ギフト',        labelVi: 'Quà tặng',        labelEn: 'Gift'             },
  { value: 'p2p_transfer',     labelJa: '個人間送金',    labelVi: 'Chuyển tiền cá nhân', labelEn: 'P2P Transfer'  },
  { value: 'transit_charge',   labelJa: '交通系 ICチャージ', labelVi: 'Nạp thẻ giao thông', labelEn: 'Transit Card Top-up' },
  { value: 'point_redemption', labelJa: 'ポイント利用',  labelVi: 'Đổi điểm thưởng', labelEn: 'Point Redemption' },
]

// ── OCR Status Labels ─────────────────────────────────────────
export const OCR_STATUSES: {
  value: OcrStatus
  labelJa: string
  labelVi: string
  labelEn: string
  color: string
}[] = [
  { value: 'pending',          labelJa: '待機中',      labelVi: 'Chờ xử lý',    labelEn: 'Pending',          color: '#94a3b8' },
  { value: 'processing',       labelJa: '処理中',      labelVi: 'Đang xử lý',   labelEn: 'Processing',       color: '#3b82f6' },
  { value: 'completed',        labelJa: '完了',        labelVi: 'Hoàn thành',   labelEn: 'Completed',        color: '#22c55e' },
  { value: 'failed',           labelJa: '失敗',        labelVi: 'Thất bại',     labelEn: 'Failed',           color: '#ef4444' },
  { value: 'review_required',  labelJa: '要確認',      labelVi: 'Cần xem xét',  labelEn: 'Review Required',  color: '#eab308' },
]

// ── Category Types ─────────────────────────────────────────
export const CATEGORY_TYPES: {
  value: CategoryType
  labelJa: string
  labelVi: string
  labelEn: string
  emoji: string
}[] = [
  { value: 'expense',         labelJa: '支出',     labelVi: 'Chi tiêu',        labelEn: 'Expense',        emoji: '📤' },
  { value: 'income',          labelJa: '収入',     labelVi: 'Thu nhập',        labelEn: 'Income',         emoji: '📥' },
  { value: 'transfer',        labelJa: '振替',     labelVi: 'Chuyển khoản',    labelEn: 'Transfer',       emoji: '🔄' },
  { value: 'asset_transfer',  labelJa: '資産移動', labelVi: 'Chuyển tài sản',  labelEn: 'Asset Transfer', emoji: '🔀' },
  { value: 'reimbursement',   labelJa: '精算',     labelVi: 'Hoàn trả',        labelEn: 'Reimbursement',  emoji: '💸' },
]

// ── V3 System Dimension Keys ─────────────────────────────────────
export const SYSTEM_DIMENSION_KEYS = [
  'expense_scope',
  'household_member',
  'project',
  'department',
  'cost_center',
  'payment_responsibility',
  'lifestyle_category',
] as const

export type SystemDimensionKey = typeof SYSTEM_DIMENSION_KEYS[number]
