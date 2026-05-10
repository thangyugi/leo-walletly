import type { Category, CustomGroup, PaymentProvider } from '@/types'

export const APP_NAME = 'Leo Walletly'

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
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
    value: 'rakuten-pay', label: 'Rakuten Pay', color: '#BF0000', initials: 'RP',
    region: 'jp', fileTypes: ['csv', 'pdf'],
    descJa: '楽天ペイ 取引明細 CSV / PDF',
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
    value: 'paypay-card', label: 'PayPayカード', color: '#8B1AFF', initials: 'PC',
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
    value: 'generic-csv', label: 'CSV Chung', color: '#6366F1', initials: 'GC',
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
    value: 'ai-scan', label: 'AI Scan', color: '#3b82f6', initials: 'AI',
    region: 'global', fileTypes: [],
    descJa: 'AI レシートスキャン',
    descVi: 'Quét hóa đơn bằng AI',
    descEn: 'AI receipt scan',
  },
]

export const DEFAULT_GROUPS: CustomGroup[] = [
  {
    id: 'f0000000-0000-4000-a000-000000000001',
    name: '食費',
    emoji: '🍜',
    color: '#f97316',
    categoryKey: 'food',
    isDefault: true,
    keywords: [
      'セブン', 'ローソン', 'ファミマ', 'ファミリーマート', 'ミニストップ', 'デイリーヤマザキ',
      'イオン', 'まいばすけっと', 'ライフ', 'マルエツ', 'サミット', 'コープ', '西友', 'マックスバリュ',
      'マクドナルド', 'モスバーガー', 'ケンタッキー', 'すき家', '吉野家', '松屋', 'ガスト', 'デニーズ',
      'スターバックス', 'スタバ', 'ドトール', 'タリーズ', 'コメダ', 'エクセルシオール',
      'ubereats', 'cokeon', 'wolt', '出前館', 'menu',
      'レストラン', '食堂', '居酒屋', 'ラーメン', '弁当', 'カフェ', 'コンビニ',
    ],
  },
  {
    id: 'f0000000-0000-4000-a000-000000000002',
    name: '交通費',
    emoji: '🚃',
    color: '#3b82f6',
    categoryKey: 'transport',
    isDefault: true,
    keywords: [
      'スイカ', 'パスモ', 'suica', 'pasmo',
      'メトロ', '地下鉄', '東京メトロ', '電車', 'jr', '小田急', '東急', '京王', '東武', '西武', '京急', '阪急',
      'タクシー', 'uber', 'didi', 'go タクシー', 'ライドシェア',
      '新幹線', '高速', 'バス', '路線バス', '空港', 'aina',
    ],
  },
  {
    id: 'f0000000-0000-4000-a000-000000000003',
    name: '買い物',
    emoji: '🛍️',
    color: '#a855f7',
    categoryKey: 'shopping',
    isDefault: true,
    keywords: [
      'amazon', '楽天', 'rakuten', 'メルカリ',
      'ユニクロ', 'gu', 'zara', 'h&m', 'しまむら',
      'ヨドバシ', 'ビックカメラ', 'ヤマダ', 'コジマ', 'ケーズデンキ',
      'ドンキ', 'ドン・キホーテ', 'コストコ', 'ニトリ', 'ハンズ', 'ロフト',
      '100均', 'セリア', 'ダイソー', 'キャンドゥ',
      'アマゾン', 'ショッピング', '通販',
    ],
  },
  {
    id: 'f0000000-0000-4000-a000-000000000004',
    name: '娯楽',
    emoji: '🎮',
    color: '#ec4899',
    categoryKey: 'entertainment',
    isDefault: true,
    keywords: [
      'netflix', 'spotify', 'youtube', 'disney', 'hulu', 'dazn', 'abema',
      'prime video', 'amazon prime', 'apple tv',
      'カラオケ', 'まねきねこ', 'ビッグエコー', 'ジョイサウンド',
      '映画', 'シネマ', 'イオンシネマ', 'toho', 'ユナイテッド',
      'steam', 'playstation', 'nintendo', 'game', 'ゲーム',
      '漫画', '書籍', '本', 'kindle', 'コミック',
      'ライブ', 'コンサート', 'チケット',
    ],
  },
  {
    id: 'f0000000-0000-4000-a000-000000000005',
    name: '医療・健康',
    emoji: '💊',
    color: '#14b8a6',
    categoryKey: 'health',
    isDefault: true,
    keywords: [
      'マツキヨ', 'ウエルシア', 'ツルハ', 'サンドラッグ', 'スギ薬局', 'コクミン',
      '薬局', 'ドラッグ', '調剤',
      '病院', 'クリニック', '歯医者', '歯科', '内科', '皮膚科', '眼科', '整形外科',
      '診察', '処方', '医療',
      'ジム', 'フィットネス', 'スポーツクラブ', 'エニタイム', 'セントラル', 'ゴールドジム',
      '整骨院', '接骨院', 'マッサージ',
    ],
  },
  {
    id: 'f0000000-0000-4000-a000-000000000006',
    name: '光熱費・通信',
    emoji: '💡',
    color: '#eab308',
    categoryKey: 'utilities',
    isDefault: true,
    keywords: [
      '東京電力', '東電', '関西電力', '電気', '電力',
      '東京ガス', '大阪ガス', 'ガス',
      '水道', '東京都水道',
      'docomo', 'au', 'softbank', 'rakuten mobile', 'iij', 'nuro',
      '携帯', '電話', 'スマホ', '通信', 'インターネット', 'wifi',
      'ntt', 'nhk', '固定費',
    ],
  },
  {
    id: 'f0000000-0000-4000-a000-000000000007',
    name: 'その他',
    emoji: '📦',
    color: '#94a3b8',
    categoryKey: 'other',
    isDefault: true,
    keywords: [],
  },
]

export const CATEGORY_COLORS: Record<Category, string> = {
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
