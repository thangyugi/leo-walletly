'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, Download, Plus, MoreVertical,
  Sun, Shield, ChevronLeft, ChevronRight,
  Check, X, ArrowRight, Clock,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
type DetailTab = 'overview' | 'subgroups' | 'keywords' | 'transactions' | 'balances' | 'members' | 'settings'

/* ─────────────────────────────────────────────────────────────
   Mock data  (mirrors the group-detail.html exactly)
───────────────────────────────────────────────────────────── */
const GROUP = {
  id:       'travel-dalat',
  name:     'Du lịch Đà Lạt 2026',
  emoji:    '🌲',
  glyph:    'DL',
  gradient: 'linear-gradient(135deg,#0f766e 0%,#10b981 60%,#34d399 130%)',
  sub:      '5 thành viên · VND · Chủ nhóm: Mai · 04 → 09 tháng 5 · Chia đều mặc định',
  members: [
    { initials: 'MA', bg: '#fef3c7', color: '#b45309', name: 'Mai · chủ chuyến', paid: 5_040_000, balance: 2_472_000 },
    { initials: 'LI', bg: '#dbeafe', color: '#2563eb', name: 'Linh',              paid: 4_200_000, balance: 1_632_000 },
    { initials: 'YN', bg: '#d1fae5', color: '#047857', name: 'Bạn (Yến Nhi)',      paid: 2_148_000, balance: -420_000 },
    { initials: 'HU', bg: '#ecfdf5', color: '#047857', name: 'Hùng',              paid: 730_000,   balance: -1_838_000 },
    { initials: 'TU', bg: '#fee2e2', color: '#b91c1c', name: 'Tuấn',              paid: 720_000,   balance: -1_848_000 },
  ],
}

const STATS = [
  { label: 'Tổng chi tiêu',    value: '12.840.000', unit: '₫', sub: '18 giao dịch · 4 ngày' },
  { label: 'Ngân sách',        value: '20.000.000', unit: '₫', sub: '64% · còn 7.160.000 ₫', subBrand: true },
  { label: 'Trung bình / người', value: '2.568.000', unit: '₫', sub: '5 thành viên · chia đều' },
  { label: 'Bạn đã trả',       value: '2.148.000', unit: '₫', sub: 'Còn nợ 420.000 ₫', subLoss: true },
  { label: 'Tự động khớp',     value: '15',          unit: ' / 18', sub: '83% · 3 cần xem lại', subBrand: true },
]

const SUB_GROUPS = [
  { emoji: '🍜', bg: '#fef3c7', name: 'Ăn uống',  count: 7, amount: 4_820_000, pct: 38, barPct: 96, budget: 5_000_000, barClass: 'warn' },
  { emoji: '🏨', bg: '#dbeafe', name: 'Lưu trú',  count: 2, amount: 4_200_000, pct: 33, barPct: 84, budget: 5_000_000, barClass: 'ok'   },
  { emoji: '🚃', bg: '#fee2e2', name: 'Di chuyển', count: 4, amount: 2_118_000, pct: 16, barPct: 53, budget: 4_000_000, barClass: 'ok'   },
  { emoji: '🎟️', bg: '#dcfce7', name: 'Tham quan', count: 3, amount: 1_190_000, pct: 9,  barPct: 60, budget: 2_000_000, barClass: 'ok'   },
  { emoji: '🛍️', bg: '#f3e8ff', name: 'Mua sắm',  count: 2, amount: 512_000,   pct: 4,  barPct: 26, budget: 2_000_000, barClass: 'ok'   },
]

const LINKED_ACCOUNTS = [
  { logo: 'VCB', color: '#10b981', name: 'Vietcombank · cá nhân',  meta: '••8821 · Thẻ ghi nợ',        amount: 7_420_000, dist: 58 },
  { logo: 'MM',  color: '#7c3aed', name: 'MoMo · ví điện tử',      meta: '••5573 · Tự động đồng bộ',    amount: 3_300_000, dist: 26 },
  { logo: '$',   color: '#64748b', name: 'Tiền mặt',                meta: 'Ghi tay · 6 mục',             amount: 2_120_000, dist: 16 },
]

const KW_SECTIONS = [
  {
    title: 'Cho cả nhóm Du lịch Đà Lạt',
    count: 5,
    hint: '· khớp tên cửa hàng / mô tả',
    keywords: [
      { text: 'đà lạt',      hits: 12, auto: false },
      { text: 'datanla',     hits: 3,  auto: false },
      { text: 'anna resort', hits: 2,  auto: false },
      { text: 'phương trang',hits: 2,  auto: false },
      { text: 'grab.*dalat', hits: 5,  auto: true  },
    ],
    suggests: [],
    placeholder: 'thêm từ khóa…',
  },
  {
    title: 'Cho nhóm con · Ăn uống',
    count: 3,
    hint: '· phân nhóm con sau khi đã khớp nhóm cha',
    keywords: [
      { text: 'bbq',       hits: 0,  auto: false },
      { text: 'cà phê',    hits: 4,  auto: false },
      { text: 'quán ngon', hits: 1,  auto: false },
    ],
    suggests: ['highlands', 'the coffee house', 'phở'],
    placeholder: 'thêm từ khóa…',
  },
  {
    title: 'Cho nhóm con · Di chuyển',
    count: 4,
    hint: '',
    keywords: [
      { text: 'grab',     hits: 8,  auto: false },
      { text: 'xăng',     hits: 2,  auto: false },
      { text: 'vetc',     hits: 1,  auto: false },
      { text: 'cao tốc',  hits: 2,  auto: false },
    ],
    suggests: [],
    placeholder: 'thêm từ khóa…',
  },
  {
    title: 'Cho nhóm con · Lưu trú · Tham quan · Mua sắm',
    count: 2,
    hint: '',
    keywords: [
      { text: 'resort',      hits: 2,  auto: false },
      { text: 'vé tham quan', hits: 3,  auto: false },
    ],
    suggests: ['Tạo nhanh cho 3 nhóm còn lại'],
    placeholder: 'thêm từ khóa…',
  },
]

const TRANSACTIONS = [
  { avatar: '🏨', avatarBg: '#dbeafe', desc: 'Resort Anna · 2 đêm',           meta: 'Hôm nay 14:22 · VCB ••8821 · Mai trả · Chia đều 5 người',      kwMatch: 'anna resort', amount: -4_200_000 },
  { avatar: '🍜', avatarBg: '#fef3c7', desc: 'BBQ tối · Quán Ngon',            meta: 'Hôm qua 19:48 · MoMo ••5573 · Bạn trả · Chia 4/5',            kwMatch: 'quán ngon',   amount: -1_480_000 },
  { avatar: '🚃', avatarBg: '#fee2e2', desc: 'Vé xe khách Phương Trang',        meta: 'Hôm qua 08:00 · Tiền mặt · Linh trả · Chia đều',              kwMatch: 'phương trang',amount: -1_450_000 },
  { avatar: '?',  avatarBg: '#f3f4f6', desc: 'Tipsy Cafe · Đường Khe Sanh',     meta: '07/05 16:30 · VCB ••8821 · Bạn trả',                          review: true,           amount: -320_000  },
  { avatar: '🚃', avatarBg: '#fee2e2', desc: 'Xăng + đường cao tốc',            meta: '06/05 06:12 · VISA ••3201 · Bạn trả · Chia 3/5',              kwMatch: 'cao tốc',     amount: -668_000  },
  { avatar: '🍜', avatarBg: '#fef3c7', desc: 'Đêm nướng Đà Lạt · An thêm 4 ảnh',meta: '06/05 21:08 · Tiền mặt · An trả · Chia đều',                kwMatch: 'đà lạt',      amount: -920_000  },
  { avatar: '🎟️', avatarBg: '#dcfce7', desc: 'Vé tham quan thác Datanla',       meta: '06/05 09:14 · VCB ••8821 · Hùng trả · Chia đều',              kwMatch: 'datanla',     amount: -500_000  },
]

const SETTLE_UP = [
  { from: { initials: 'LI', bg: '#dbeafe', color: '#2563eb', name: 'Linh' }, amount: '1.150k', to: { initials: 'YN', bg: '#d1fae5', color: '#047857', name: 'Bạn' } },
  { from: { initials: 'MA', bg: '#fef3c7', color: '#b45309', name: 'Mai'  }, amount: '880k',   to: { initials: 'TU', bg: '#fee2e2', color: '#b91c1c', name: 'Tuấn' } },
  { from: { initials: 'MA', bg: '#fef3c7', color: '#b45309', name: 'Mai'  }, amount: '1.512k', to: { initials: 'HU', bg: '#ecfdf5', color: '#047857', name: 'Hùng' } },
]

const RULES = [
  {
    conditions: [
      { field: 'mô tả',          op: 'chứa',     val: 'phương trang', style: 'kw' },
      { field: 'tài khoản',      op: '=',         val: 'VCB ••8821',  style: 'kw' },
    ],
    target: { emoji: '🚃', bg: '#fee2e2', label: 'Du lịch ĐL / Di chuyển' },
    on: true,
  },
  {
    conditions: [
      { field: 'mô tả',          op: 'khớp regex', val: 'grab.*dalat', style: 'kw-auto' },
    ],
    target: { emoji: '🚃', bg: '#fee2e2', label: 'Du lịch ĐL / Di chuyển' },
    on: true,
  },
  {
    conditions: [
      { field: 'khoảng thời gian', op: '=', val: '04 → 09 / 05 / 2026', style: 'kw' },
      { field: 'số tiền',          op: '≥', val: '200.000 ₫',           style: 'kw' },
    ],
    target: { label: 'Gắn nhãn: du-lich-dalat-26', isTag: true },
    on: false,
  },
]

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

// ── Hero cover ───────────────────────────────────────────────
function HeroCover() {
  return (
    <div
      className="relative flex items-end px-[22px] pb-[18px] pt-[52px] text-white overflow-hidden"
      style={{ background: GROUP.gradient, minHeight: 130 }}
    >
      {/* Glyph watermark */}
      <span
        className="absolute right-[-20px] top-[-20px] font-black font-mono opacity-[0.14] leading-none select-none pointer-events-none"
        style={{ fontSize: 170 }}
      >
        {GROUP.glyph}
      </span>

      {/* Badges */}
      <div className="absolute right-[18px] top-4 flex items-center gap-1.5">
        {[
          { icon: <Sun className="w-2.5 h-2.5" />, label: 'Đang hoạt động' },
          { icon: <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M3 8h18M3 16h12"/></svg></>, label: 'Tự động phân loại' },
          { icon: <Shield className="w-2.5 h-2.5" />, label: 'Mã hóa E2E' },
        ].map(b => (
          <span key={b.label} className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-medium bg-white/20 backdrop-blur-sm">
            {b.icon} {b.label}
          </span>
        ))}
      </div>

      {/* Meta + members */}
      <div className="relative z-10 flex items-end gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] leading-[1.15] m-0">
            {GROUP.emoji} {GROUP.name}
          </h2>
          <div className="flex items-center gap-2 flex-wrap text-[12px] opacity-85 mt-1">
            {GROUP.sub.split(' · ').map((part, i, arr) => (
              <React.Fragment key={i}>
                <span>{part}</span>
                {i < arr.length - 1 && <span className="opacity-45">·</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Member avatar stack */}
        <div className="flex items-center shrink-0">
          {GROUP.members.map((m, i) => (
            <span
              key={m.initials}
              className="w-[30px] h-[30px] rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold shrink-0"
              style={{
                background: m.bg,
                color: m.color,
                marginLeft: i > 0 ? -9 : 0,
                zIndex: GROUP.members.length - i,
              }}
            >{m.initials}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab bar ──────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: DetailTab; onChange: (t: DetailTab) => void }) {
  const TABS: { value: DetailTab; label: string; count?: number }[] = [
    { value: 'overview',     label: 'Tổng quan' },
    { value: 'subgroups',    label: 'Nhóm con',    count: 5 },
    { value: 'keywords',     label: 'Từ khóa',     count: 14 },
    { value: 'transactions', label: 'Giao dịch',   count: 18 },
    { value: 'balances',     label: 'Số dư' },
    { value: 'members',      label: 'Thành viên',  count: 5 },
    { value: 'settings',     label: 'Cài đặt' },
  ]
  return (
    <div className="flex items-center border-b border-[var(--color-border-subtle)]">
      <div className="flex items-center flex-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'shrink-0 px-[14px] py-[13px] text-[13px] font-medium border-b-2 -mb-px inline-flex items-center gap-1.5 cursor-pointer tracking-[-0.005em] transition-colors whitespace-nowrap',
              active === tab.value
                ? 'border-[var(--color-brand-600)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span className={cn(
                'font-mono text-[10px] px-[6px] py-[1px] rounded',
                active === tab.value
                  ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                  : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]',
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 shrink-0 border-t border-b border-[var(--color-border-subtle)] py-[7px] px-4 ml-auto">
        <button className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-transparent bg-transparent text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
          Tháng 5/2026
        </button>
      </div>
    </div>
  )
}

// ── Stats strip ──────────────────────────────────────────────
function StatsStrip() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 border-b border-[var(--color-border-subtle)]">
      {STATS.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            'px-[18px] py-[14px]',
            i < STATS.length - 1 && 'border-b md:border-b-0 md:border-r border-[var(--color-border-subtle)]',
            i === 1 && 'border-r',
          )}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{s.label}</div>
          <div className="text-[18px] font-semibold tracking-[-0.022em] font-tabular mt-1 leading-tight">
            {s.value}<span className="text-[var(--color-text-tertiary)] font-medium">{s.unit}</span>
          </div>
          <div className={cn(
            'text-[11px] mt-0.5',
            s.subBrand ? 'text-[var(--color-brand-700)]' : s.subLoss ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]',
          )}>
            {s.sub}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Sub-groups section ───────────────────────────────────────
function SubGroupsSection() {
  const [sortTab, setSortTab] = React.useState<'spend' | 'name'>('spend')
  const BAR_COLORS: Record<string, string> = { ok: 'bg-[var(--color-gain-500)]', warn: 'bg-[var(--color-warning-500)]' }

  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      {/* Section header */}
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Nhóm con</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· 5 mục</span>
        <span className="flex-1" />
        <div className="inline-flex bg-[var(--color-bg-sunken)] rounded-[7px] p-0.5">
          {(['spend', 'name'] as const).map(v => (
            <button
              key={v}
              onClick={() => setSortTab(v)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-[5px] transition-colors cursor-pointer',
                sortTab === v ? 'bg-white text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-tertiary)]',
              )}
            >
              {v === 'spend' ? 'Theo chi tiêu' : 'Theo tên'}
            </button>
          ))}
        </div>
        <button className="inline-flex items-center gap-1 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors">
          <Plus className="w-3 h-3" /> Thêm nhóm con
        </button>
      </div>

      {/* Sub-group grid */}
      <div className="p-[14px_18px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SUB_GROUPS.map(sg => (
          <div key={sg.name} className="p-3 border border-[var(--color-border-default)] rounded-[10px] hover:border-[var(--color-interactive-primary)] transition-colors cursor-pointer group">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-6 h-6 rounded-[6px] flex items-center justify-center text-sm shrink-0" style={{ background: sg.bg }}>{sg.emoji}</span>
              <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate flex-1">{sg.name}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]">{sg.count}</span>
            </div>
            <div className="text-[13px] font-semibold font-tabular tracking-[-0.01em]">
              {fmtVND(sg.amount)}<span className="text-[var(--color-text-tertiary)] font-medium text-[11px]"> ₫ · {sg.pct}%</span>
            </div>
            <div className="h-[3px] bg-[var(--color-bg-sunken)] rounded-full mt-1.5 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', BAR_COLORS[sg.barClass] ?? BAR_COLORS.ok)}
                style={{ width: `${sg.barPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-[var(--color-text-tertiary)] font-tabular">
              <span>NS {fmtVND(sg.budget)} ₫</span>
              <span>{sg.barPct}%</span>
            </div>
          </div>
        ))}
        <button className="p-3 border-2 border-dashed border-[var(--color-border-default)] rounded-[10px] hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)] transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 min-h-[80px]">
          <Plus className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
          <span className="text-[11px] text-[var(--color-text-quaternary)] font-medium">Tạo nhóm con</span>
        </button>
      </div>
    </section>
  )
}

// ── Linked accounts section ──────────────────────────────────
function LinkedAccountsSection() {
  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Tài khoản liên kết</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· 3</span>
        <span className="flex-1" />
        <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-transparent hover:bg-[var(--color-bg-sunken)] transition-colors text-[var(--color-text-tertiary)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4v16h16v-7M18 2l4 4-10 10H8v-4z"/></svg>
        </button>
      </div>

      <div className="divide-y divide-[var(--color-border-subtle)]">
        {LINKED_ACCOUNTS.map(acc => (
          <div key={acc.name} className="flex items-center gap-3 px-[18px] py-3 hover:bg-[var(--color-bg-sunken)] transition-colors">
            <div
              className="w-9 h-9 rounded-[9px] flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{ background: acc.color }}
            >{acc.logo}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text-primary)] leading-snug">{acc.name}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono">{acc.meta}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-[var(--color-text-quaternary)]">đã chi</div>
              <div className="text-[13px] font-semibold font-tabular text-[var(--color-text-primary)]">{fmtVND(acc.amount)} ₫</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-[18px] py-3 border-t border-[var(--color-border-subtle)]">
        <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors">
          <Plus className="w-3 h-3" /> Liên kết tài khoản
        </button>
      </div>

      {/* Distribution */}
      <div className="px-[18px] py-[10px] pb-[14px] border-t border-[var(--color-border-subtle)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-1.5">Phân bổ chi tiêu</div>
        <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-bg-sunken)]">
          {LINKED_ACCOUNTS.map(acc => (
            <div key={acc.logo} style={{ width: `${acc.dist}%`, background: acc.color }} />
          ))}
        </div>
        <div className="flex items-center gap-2.5 flex-wrap mt-2">
          {LINKED_ACCOUNTS.map(acc => (
            <span key={acc.logo} className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)] font-mono">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: acc.color }} />
              {acc.logo} {acc.dist}%
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Toggle switch ────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        'relative w-8 h-4 rounded-full transition-colors shrink-0',
        on ? 'bg-[var(--color-interactive-primary)]' : 'bg-[var(--color-border-strong)]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-xs transition-transform',
          on ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

// ── Keyword manager section ──────────────────────────────────
function KeywordManagerSection() {
  const [sections, setSections] = React.useState(
    KW_SECTIONS.map(s => ({ ...s, keywords: [...s.keywords], inputVal: '' }))
  )
  const [rules, setRules] = React.useState(RULES.map(r => ({ ...r })))

  function removeKw(si: number, ki: number) {
    setSections(prev => {
      const next = [...prev]
      const kws = [...next[si].keywords]
      kws.splice(ki, 1)
      next[si] = { ...next[si], keywords: kws }
      return next
    })
  }

  function addKw(si: number) {
    setSections(prev => {
      const next = [...prev]
      const val = next[si].inputVal.trim()
      if (val && !next[si].keywords.find(k => k.text === val)) {
        next[si] = {
          ...next[si],
          keywords: [...next[si].keywords, { text: val, hits: 0, auto: false }],
          inputVal: '',
        }
      }
      return next
    })
  }

  function promoteSuggest(si: number, text: string) {
    setSections(prev => {
      const next = [...prev]
      const suggests = next[si].suggests.filter(s => s !== text)
      const keywords = [...next[si].keywords, { text, hits: 0, auto: false }]
      next[si] = { ...next[si], suggests, keywords }
      return next
    })
  }

  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)] flex-wrap">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Từ khóa tự động phân loại</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· dùng để khớp giao dịch nhập từ ngân hàng/CSV</span>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]">
          <Sun className="w-3 h-3" /> Học từ lịch sử
        </span>
        <button className="inline-flex items-center gap-1 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4v16h16v-7M18 2l4 4-10 10H8v-4z"/></svg>
          Quy tắc nâng cao
        </button>
      </div>

      {/* Keyword sections */}
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {sections.map((section, si) => (
          <div key={si} className="px-[18px] py-4">
            <h5 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-3">
              {section.title}
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)]">{section.count}</span>
              {section.hint && (
                <span className="normal-case tracking-normal font-normal text-[11px] text-[var(--color-text-tertiary)]">{section.hint}</span>
              )}
            </h5>
            <div className="flex flex-wrap gap-2">
              {section.keywords.map((kw, ki) => (
                <span
                  key={ki}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg border',
                    kw.auto
                      ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-100)] text-[var(--color-brand-700)]'
                      : 'bg-[var(--color-bg-sunken)] border-[var(--color-border-default)] text-[var(--color-text-secondary)]',
                  )}
                >
                  {kw.auto && <span className="text-[9px] font-bold px-1 bg-[var(--color-brand-100)] rounded text-[var(--color-brand-700)]">RE</span>}
                  {kw.text}
                  {kw.hits > 0 && (
                    <span className="font-mono text-[10px] font-semibold opacity-60">{kw.hits}</span>
                  )}
                  <button
                    onClick={() => removeKw(si, ki)}
                    className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-loss)] transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {/* Suggestions */}
              {section.suggests.map(suggest => (
                <button
                  key={suggest}
                  onClick={() => promoteSuggest(si, suggest)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-dashed border-[var(--color-border-default)] text-[var(--color-text-quaternary)] hover:border-[var(--color-interactive-primary)] hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  <span className="text-[var(--color-interactive-primary)]">+</span>
                  {suggest.startsWith('Tạo') ? suggest : `Gợi ý: "${suggest}"`}
                </button>
              ))}
              {/* Inline input */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-[var(--color-border-default)] text-[11px] text-[var(--color-text-quaternary)]">
                <Plus className="w-3 h-3" />
                <input
                  value={section.inputVal}
                  onChange={e => setSections(prev => {
                    const next = [...prev]
                    next[si] = { ...next[si], inputVal: e.target.value }
                    return next
                  })}
                  onKeyDown={e => e.key === 'Enter' && addKw(si)}
                  placeholder={section.placeholder}
                  className="outline-none bg-transparent text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] w-24"
                />
                <span className="font-mono text-[9px] text-[var(--color-text-quaternary)]">Enter</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced rules */}
      <div className="bg-[var(--color-bg-canvas)] border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2 px-[18px] py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
          <Clock className="w-3 h-3" />
          Quy tắc đang hoạt động
          <span className="flex-1" />
          <span className="normal-case font-normal tracking-normal text-[var(--color-text-quaternary)]">áp dụng tự động khi import</span>
        </div>
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {rules.map((rule, ri) => (
            <div key={ri} className="flex items-center gap-3 px-[18px] py-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] flex-1 min-w-0">
                <span className="font-semibold text-[var(--color-text-tertiary)]">Khi</span>
                {rule.conditions.map((cond, ci) => (
                  <React.Fragment key={ci}>
                    {ci > 0 && <span className="text-[var(--color-text-tertiary)]">và</span>}
                    <span className="font-mono text-[11px] bg-white border border-[var(--color-border-default)] px-1.5 py-0.5 rounded-[5px]">{cond.field}</span>
                    <span className="text-[var(--color-text-tertiary)]">{cond.op}</span>
                    <span className={cn(
                      'font-medium px-2 py-0.5 rounded-lg text-[11px]',
                      cond.style === 'kw-auto'
                        ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-100)]'
                        : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]',
                    )}>{cond.val}</span>
                  </React.Fragment>
                ))}
              </div>
              <span className="text-[var(--color-text-quaternary)] shrink-0">→</span>
              <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                {rule.target.isTag ? (
                  <span className="bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] text-[11px]">{rule.target.label}</span>
                ) : (
                  <>
                    <span className="w-5 h-5 rounded-[5px] flex items-center justify-center text-xs" style={{ background: rule.target.bg }}>{rule.target.emoji}</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{rule.target.label}</span>
                  </>
                )}
                <Toggle on={rule.on} onChange={v => setRules(prev => {
                  const next = [...prev]
                  next[ri] = { ...next[ri], on: v }
                  return next
                })} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-[18px] py-[10px]">
          <button className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors">
            <Plus className="w-3 h-3" /> Thêm quy tắc
          </button>
          <button className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-transparent text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)] transition-colors">
            Chạy thử trên giao dịch chưa khớp (9)
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Recent transactions ──────────────────────────────────────
function RecentTransactions() {
  const [txTab, setTxTab] = React.useState<'all' | 'auto' | 'review'>('all')
  const TX_TABS = [
    { value: 'all',    label: 'Tất cả' },
    { value: 'auto',   label: 'Tự động' },
    { value: 'review', label: 'Cần xem lại', badge: 3 },
  ] as const

  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)] flex-wrap">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Hoạt động gần đây</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· 18 giao dịch</span>
        <span className="flex-1" />
        <div className="inline-flex bg-[var(--color-bg-sunken)] rounded-[7px] p-0.5">
          {TX_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setTxTab(tab.value as any)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-[5px] transition-colors cursor-pointer inline-flex items-center gap-1',
                txTab === tab.value ? 'bg-white text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-tertiary)]',
              )}
            >
              {tab.label}
              {'badge' in tab && (
                <span className="font-mono text-[9px] bg-[var(--color-loss-50)] text-[var(--color-loss-600)] px-1 rounded">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-[var(--color-border-subtle)]">
        {TRANSACTIONS.map((tx, i) => (
          <div key={i} className="grid items-center gap-3 px-[18px] py-[11px] hover:bg-[var(--color-bg-sunken)] transition-colors" style={{ gridTemplateColumns: '32px 1fr auto auto' }}>
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-sm shrink-0" style={{ background: tx.avatarBg }}>{tx.avatar}</div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{tx.desc}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-0.5 truncate">{tx.meta}</div>
            </div>
            {tx.review ? (
              <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-[var(--color-warning-50)] text-[var(--color-warning-600)] shrink-0">cần xem lại</span>
            ) : (
              <span className="text-[11px] font-medium text-[var(--color-brand-700)] bg-[var(--color-brand-50)] px-2 py-0.5 rounded-md shrink-0">
                khớp "{tx.kwMatch}"
              </span>
            )}
            <span className="text-[13px] font-semibold font-tabular text-[var(--color-text-loss)] shrink-0">
              −{fmtVND(Math.abs(tx.amount))} ₫
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center px-[18px] py-3 border-t border-[var(--color-border-subtle)]">
        <span className="text-[11px] text-[var(--color-text-quaternary)]">Hiển thị 7 / 18</span>
        <span className="flex-1" />
        <button className="text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-sunken)]">
          Xem tất cả →
        </button>
      </div>
    </section>
  )
}

// ── Settle-up section ────────────────────────────────────────
function SettleUpSection() {
  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      {/* Gradient header */}
      <div
        className="flex items-center gap-3 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]"
        style={{ background: 'linear-gradient(180deg,var(--color-brand-25) 0%,white 100%)' }}
      >
        <div className="w-9 h-9 rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0">
          <ArrowRight className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold tracking-[-0.005em]">Đối soát chỉ với 3 lệnh</div>
          <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">18 giao dịch → 3 đường thanh toán tối ưu</div>
        </div>
        <button className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors">
          Đối soát
        </button>
      </div>

      <div className="p-[14px_18px] flex flex-col gap-2">
        {SETTLE_UP.map((s, i) => (
          <div key={i} className="grid items-center gap-2 p-2 border border-dashed border-[var(--color-border-default)] rounded-[9px] bg-[var(--color-bg-canvas)] text-[11px]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0" style={{ background: s.from.bg, color: s.from.color }}>{s.from.initials}</span>
              {s.from.name}
            </div>
            <span className="font-semibold font-tabular text-center">→ {s.amount}</span>
            <div className="flex items-center gap-1.5 justify-end">
              {s.to.name}
              <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0" style={{ background: s.to.bg, color: s.to.color }}>{s.to.initials}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Balances section ─────────────────────────────────────────
function BalancesSection() {
  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Số dư từng người</h3>
        <span className="flex-1" />
        <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">5p trước</span>
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {GROUP.members.map(m => (
          <div key={m.initials} className="flex items-center gap-3 px-[18px] py-[10px] hover:bg-[var(--color-bg-sunken)] transition-colors">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
              style={{ background: m.bg, color: m.color }}
            >{m.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text-primary)]">{m.name}</div>
              <div className={cn('text-[11px] font-mono mt-0.5', m.balance < 0 ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]')}>
                đã trả {fmtVND(m.paid)} ₫
              </div>
            </div>
            <div className={cn(
              'text-[13px] font-semibold font-tabular shrink-0',
              m.balance >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]',
            )}>
              {m.balance >= 0 ? '+' : '−'}{fmtVND(Math.abs(m.balance))} ₫
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main GroupDetailView
───────────────────────────────────────────────────────────── */
export function GroupDetailView({ groupId }: { groupId: string }) {
  const [activeTab, setActiveTab] = React.useState<DetailTab>('overview')

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* ── Hero card ── */}
      <div className="bg-white border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
        <HeroCover />
        <TabBar active={activeTab} onChange={setActiveTab} />
        <StatsStrip />
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'overview' && (
        <>
          {/* Row 1: Sub-groups + Linked accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><SubGroupsSection /></div>
            <div><LinkedAccountsSection /></div>
          </div>

          {/* Keyword manager */}
          <KeywordManagerSection />

          {/* Row 2: Recent transactions + Settle-up + Balances */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><RecentTransactions /></div>
            <div className="flex flex-col gap-4">
              <SettleUpSection />
              <BalancesSection />
            </div>
          </div>
        </>
      )}

      {activeTab === 'subgroups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><SubGroupsSection /></div>
        </div>
      )}

      {activeTab === 'keywords' && <KeywordManagerSection />}

      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><RecentTransactions /></div>
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><SettleUpSection /></div>
          <BalancesSection />
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
          <BalancesSection />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white border border-[var(--color-border-default)] rounded-[14px] p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm text-[var(--color-text-tertiary)]">Cài đặt nhóm – sắp ra mắt</p>
        </div>
      )}
    </div>
  )
}
