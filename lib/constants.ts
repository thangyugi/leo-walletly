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

export const PROVIDERS: { value: PaymentProvider; label: string; color: string }[] = [
  { value: 'rakuten-pay', label: 'Rakuten Pay', color: '#BF0000' },
  { value: 'paypay', label: 'PayPay', color: '#FF0033' },
  { value: 'paypay-card', label: 'PayPayカード', color: '#8B1AFF' },
  { value: 'manual', label: '手動入力', color: '#0d9159' },
]

export const DEFAULT_GROUPS: CustomGroup[] = [
  {
    id: 'default-food',
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
    id: 'default-transport',
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
    id: 'default-shopping',
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
    id: 'default-entertainment',
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
    id: 'default-health',
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
    id: 'default-utilities',
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
    id: 'default-other',
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
