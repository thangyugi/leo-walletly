'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { GroupForm } from './group-form'
import { useGroupStore } from './store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useSettingsStore } from '@/stores/settings'
import {
  Plus, ChevronDown, ArrowUpRight, Sun, Zap, Globe,
  Shield, BarChart3, TrendingDown, Filter,
  LayoutGrid, ChevronUp, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

/* ─────────────────────────────────────────────────────────────
   Static mock data (mirrors design exactly)
───────────────────────────────────────────────────────────── */
const MOCK_KPI = [
  { label: 'Chi tiêu tháng này',  value: '18.420.000', unit: '₫',          sub: '+12% so với T4 · 8 nhóm',               subLoss: true },
  { label: 'Ngân sách còn lại',   value: '6.580.000',  unit: '₫',          sub: '26% · còn 13 ngày trong tháng',          subLoss: false },
  { label: 'Tự động phân loại',   value: '94',          unit: '%',          sub: '128 / 137 giao dịch · 47 từ khóa',      subLoss: false },
  { label: 'Chờ đối soát',        value: '3',           unit: ' giao dịch', sub: 'Linh, Hùng · −420.000 ₫ tổng',          subLoss: false },
]

const FILTER_TABS = [
  { value: 'all',      label: 'Tất cả',         count: 8 },
  { value: 'active',   label: 'Đang hoạt động', count: 5 },
  { value: 'shared',   label: 'Chia sẻ',        count: 4 },
  { value: 'recurring',label: 'Định kỳ',        count: 2 },
  { value: 'archived', label: 'Lưu trữ',        count: 3 },
]

const MOCK_FEATURED = {
  id: 'travel-dalat',
  name: 'Du lịch Đà Lạt 2026',
  emoji: '🌲',
  glyph: 'DL',
  status: 'Đang hoạt động',
  daysActive: 4,
  meta: '5 thành viên · VND · Chia đều mặc định',
  totalExpense: 12_840_000,
  budget: 20_000_000,
  pct: 64,
  remaining: 7_160_000,
  gradient: 'linear-gradient(135deg,#0f766e 0%,#10b981 60%,#34d399 130%)',
  accounts: [
    { label: 'VCB ••8821',  color: '#10b981' },
    { label: 'MoMo ••5573', color: '#7c3aed' },
  ],
  subGroups: [
    { emoji: '🍜', bg: '#fef3c7', name: 'Ăn uống',    amount: 4_820_000 },
    { emoji: '🏨', bg: '#dbeafe', name: 'Lưu trú',    amount: 4_200_000 },
    { emoji: '🚃', bg: '#fee2e2', name: 'Di chuyển',  amount: 2_118_000 },
  ],
  extraCount: 2,
  extraAmount: 1_702_000,
}

const MOCK_GROUPS = [
  {
    id: 'chung-cu',
    emoji: '🏠', iconBg: '#f3e8ff',
    name: 'Chung cư Eco · tiền nhà',
    meta: 'Định kỳ · ngày 5 hàng tháng',
    amount: 2_833_000,
    amountColor: 'normal',
    progressLabel: 'Đã thu 100%',
    progressRight: '3 / 3 thành viên',
    pct: 100, barClass: 'ok',
    account: { label: 'BIDV ••4406', color: '#1e40af' },
    members: [
      { initials: 'M', bg: '#fef3c7', color: '#b45309' },
      { initials: 'H', bg: '#ecfdf5', color: '#047857' },
      { initials: 'T', bg: '#fee2e2', color: '#b91c1c' },
    ],
  },
  {
    id: 'gia-dinh',
    emoji: '👨‍👩‍👧', iconBg: '#dbeafe',
    name: 'Gia đình · sinh hoạt',
    meta: '4 thành viên · ngân sách 8tr',
    amount: 4_260_000,
    amountColor: 'normal',
    progressLabel: '53% ngân sách',
    progressRight: 'còn 3.740.000 ₫',
    pct: 53, barClass: 'ok',
    account: { label: 'VCB Joint ••2210', color: '#10b981' },
    members: [
      { initials: 'B', bg: '#fee2e2', color: '#b91c1c' },
      { initials: 'M', bg: '#ecfdf5', color: '#047857' },
      { initials: 'A', bg: '#dbeafe', color: '#2563eb' },
    ],
    moreMem: 1,
  },
  {
    id: 'sinh-nhat',
    emoji: '🎂', iconBg: '#fee2e2',
    name: 'Sinh nhật Mai · 12/05',
    meta: '7 thành viên · 4 giao dịch',
    amount: 0,
    amountLabel: 'đã đối soát',
    amountColor: 'muted',
    progressLabel: '1.680.000 ₫ · chia đều',
    progressRight: '240.000 ₫/người',
    pct: 100, barClass: 'ok',
    account: { label: 'MoMo ••5573', color: '#f59e0b' },
    members: [
      { initials: 'L', bg: '#dbeafe', color: '#2563eb' },
      { initials: 'M', bg: '#fef3c7', color: '#b45309' },
    ],
    moreMem: 5,
  },
  {
    id: 'tra-sua',
    emoji: '🧋', iconBg: '#fef3c7',
    name: 'Văn phòng · Trà sữa',
    meta: '12 thành viên · luân phiên',
    amount: 540_000,
    amountColor: 'normal',
    progressLabel: 'Đến lượt: An',
    progressRight: 'thứ 6 này',
    pct: 82, barClass: 'warn',
    account: { label: 'Tiền mặt · luân phiên', color: '#64748b' },
    members: [
      { initials: 'M', bg: '#fef3c7', color: '#b45309' },
      { initials: 'A', bg: '#f3e8ff', color: '#7e22ce' },
    ],
    moreMem: 10,
  },
  {
    id: 'an-trua',
    emoji: '🍱', iconBg: '#dcfce7',
    name: 'Ăn trưa cá nhân',
    meta: 'Chỉ mình bạn · 28 giao dịch',
    amount: 2_150_000,
    amountColor: 'loss',
    progressLabel: 'Vượt ngân sách 8%',
    progressLabelColor: 'loss',
    progressRight: '2.000.000 ₫',
    pct: 100, barClass: 'over',
    account: { label: 'MoMo ••5573', color: '#7c3aed' },
    members: [
      { initials: 'YN', bg: '#d1fae5', color: '#047857' },
    ],
  },
]

const MOCK_SMART_CLASSIFY = [
  { merchant: 'Grab', keyword: 'grab', suffix: 'ride 06/05', groupEmoji: '🚃', groupName: 'Di chuyển · Du lịch ĐL' },
  { merchant: 'Highlands Coffee', keyword: 'cf', suffix: '14:22', groupEmoji: '☕', groupName: 'Cà phê · Văn phòng' },
  { merchant: 'EVN ĐN', keyword: 'điện', suffix: 'kỳ 05/2026', groupEmoji: '💡', groupName: 'Tiện ích · Gia đình' },
]

const MOCK_ARCHIVED = [
  { emoji: '💒', name: 'Đám cưới Anh Tuấn',      date: '18/03' },
  { emoji: '🎄', name: 'Quà Tết 2026',            date: '02/02' },
  { emoji: '🏝️', name: 'Phú Quốc · cuối năm 2025', date: '28/12' },
]

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

// Reusable arrow icon for card hover
function BnArrow({ className }: { className?: string }) {
  return (
    <div className={cn(
      'absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center',
      'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
      className,
    )}>
      <ArrowUpRight className="w-3.5 h-3.5" />
    </div>
  )
}

// Progress bar inner element
function BarInner({ pct, barClass }: { pct: number; barClass: string }) {
  const colorMap: Record<string, string> = {
    ok:   'bg-[var(--color-gain-500)]',
    warn: 'bg-[var(--color-warning-500)]',
    over: 'bg-[var(--color-loss-500)]',
  }
  return (
    <div
      className={cn('h-full rounded-full transition-all', colorMap[barClass] ?? colorMap.ok)}
      style={{ width: `${Math.min(pct, 100)}%` }}
    />
  )
}

// ── Featured card ────────────────────────────────────────────
function FeaturedCard() {
  const g = MOCK_FEATURED
  return (
    <Link
      href={`/groups/${g.id}`}
      className="relative col-span-1 md:col-span-2 xl:col-span-2 bg-white border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] hover:border-[var(--color-interactive-primary)] hover:shadow-md transition-all duration-200 group flex flex-col"
    >
      <BnArrow className="bg-white/20 text-white" />

      {/* Cover */}
      <div
        className="relative flex items-end p-[18px_22px] text-white overflow-hidden"
        style={{ background: g.gradient, minHeight: 150 }}
      >
        {/* Glyph watermark */}
        <span
          className="absolute right-[-20px] top-[-20px] font-black font-mono opacity-[0.14] leading-none select-none pointer-events-none"
          style={{ fontSize: 170 }}
        >
          {g.glyph}
        </span>
        {/* Status pill */}
        <span className="absolute left-[22px] top-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/20 backdrop-blur-sm border border-white/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          {g.status} · {g.daysActive} ngày
        </span>
        <div className="relative z-10 mt-8">
          <div className="flex items-center gap-2 text-xs opacity-85 flex-wrap">
            <span>{g.emoji} Du lịch</span>
            <span className="opacity-50">·</span>
            <span>5 thành viên</span>
            <span className="opacity-50">·</span>
            <span>VND</span>
            <span className="opacity-50">·</span>
            <span>Chia đều mặc định</span>
          </div>
          <h3 className="text-[22px] font-semibold tracking-[-0.025em] mt-1 leading-tight">{g.name}</h3>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-5 p-5 flex-1">
        {/* Left col */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">Tổng chi tiêu</div>
            <div className="text-[22px] font-semibold tracking-[-0.022em] font-tabular mt-0.5 leading-tight">
              {fmtVND(g.totalExpense)}<span className="text-[var(--color-text-tertiary)] font-medium text-sm"> ₫</span>
            </div>
          </div>
          <div>
            <div className="h-2 bg-[var(--color-bg-sunken)] rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-[var(--color-gain-500)] rounded-full" style={{ width: `${g.pct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
              <span>Ngân sách <b className="text-[var(--color-text-secondary)]">{fmtVND(g.budget)} ₫</b></span>
              <span><b className="text-[var(--color-text-secondary)]">{g.pct}%</b> · còn {fmtVND(g.remaining)} ₫</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.accounts.map(acc => (
              <span key={acc.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: acc.color }} />
                {acc.label}
              </span>
            ))}
          </div>
        </div>

        {/* Right col */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-2">
            {g.subGroups.length + g.extraCount} nhóm con
          </div>
          <div className="flex flex-col gap-[5px] text-[11px]">
            {g.subGroups.map(sg => (
              <div key={sg.name} className="flex items-center gap-[7px]">
                <span className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center text-[10px] shrink-0" style={{ background: sg.bg }}>{sg.emoji}</span>
                <span className="text-[var(--color-text-secondary)]">{sg.name}</span>
                <span className="ml-auto font-medium font-tabular text-[var(--color-text-primary)]">{fmtVND(sg.amount)} ₫</span>
              </div>
            ))}
            <div className="flex items-center gap-[7px] text-[var(--color-text-tertiary)]">
              <span className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center text-[10px] bg-[var(--color-bg-sunken)] shrink-0">+</span>
              <span>{g.extraCount} nhóm con khác</span>
              <span className="ml-auto font-tabular">{fmtVND(g.extraAmount)} ₫</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Dark stat card ───────────────────────────────────────────
function DarkStatCard({ variant }: { variant: 1 | 2 }) {
  const isV1 = variant === 1
  return (
    <div className="relative bg-[#111827] text-white rounded-[14px] overflow-hidden p-5 flex flex-col">
      {/* Watermark */}
      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
        {isV1 ? (
          <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20M2 12h20" />
          </svg>
        ) : (
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 20h18M7 20V10M12 20V4M17 20v-7" />
          </svg>
        )}
      </div>

      {isV1 ? (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-50 mb-1">Phân loại tự động</div>
          <div className="text-[28px] font-semibold tracking-[-0.025em] leading-tight font-tabular">
            128 <span className="text-[18px] opacity-60">/ 137</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium mt-1" style={{ color: '#34d399' }}>
            <ChevronUp className="w-3 h-3" />
            +9 hôm nay · 94% chính xác
          </div>
          <hr className="border-white/10 my-3" />
          <div className="space-y-[7px] text-[12px] opacity-80 flex-1">
            {[
              ['Cần xem lại',       '9'],
              ['Từ khóa đang dùng', '47'],
              ['Quy tắc thông minh','12'],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center">
                <span>{label}</span>
                <span className="flex-1" />
                <span className="font-semibold font-tabular opacity-100">{val}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-50 mb-1">Nhóm chi nhiều nhất · T5</div>
          <div className="text-[22px] font-semibold tracking-[-0.025em] leading-tight">Du lịch ĐL</div>
          <div className="flex items-center gap-1 text-[11px] font-medium mt-1 text-[var(--color-loss-400)]">
            <ChevronDown className="w-3 h-3" />
            12.840.000 ₫ · 70% của tháng
          </div>
          <hr className="border-white/10 my-3" />
          <div className="space-y-[7px] text-[12px] opacity-80 flex-1">
            {[
              ['Tiếp theo · Gia đình',  '4.260.000 ₫'],
              ['Chung cư Eco',          '2.833.000 ₫'],
              ['Văn phòng · Trà sữa',   '540.000 ₫'],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center">
                <span>{label}</span>
                <span className="flex-1" />
                <span className="font-semibold font-tabular opacity-100">{val}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Standard group card ──────────────────────────────────────
function GroupCard({ g, onOpenDetail }: { g: typeof MOCK_GROUPS[0]; onOpenDetail?: () => void }) {
  return (
    <Link
      href={`/groups/${g.id}`}
      className="relative bg-white border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] hover:border-[var(--color-interactive-primary)] hover:shadow-md transition-all duration-200 group p-4 flex flex-col gap-3"
    >
      <BnArrow className="bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]" />

      {/* Head */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: g.iconBg }}
        >{g.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-snug">{g.name}</div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{g.meta}</div>
        </div>
      </div>

      {/* Amount */}
      <div>
        {g.amountLabel ? (
          <div className="text-[18px] font-semibold font-tabular text-[var(--color-text-quaternary)]">{g.amountLabel}</div>
        ) : (
          <div className={cn(
            "text-[18px] font-semibold font-tabular tracking-[-0.022em]",
            g.amountColor === 'loss' ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-primary)]'
          )}>
            {fmtVND(g.amount)}<span className="text-[var(--color-text-tertiary)] font-medium text-sm"> ₫</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] mt-1.5">
          <span className={cn(
            g.progressLabelColor === 'loss' ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]'
          )}>{g.progressLabel}</span>
          <span className="text-[var(--color-text-tertiary)]">{g.progressRight}</span>
        </div>
        <div className="h-[6px] bg-[var(--color-bg-sunken)] rounded-full mt-1 overflow-hidden">
          <BarInner pct={g.pct} barClass={g.barClass} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center mt-auto pt-3 border-t border-[var(--color-border-subtle)] gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)] truncate min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.account.color }} />
          {g.account.label}
        </span>
        <span className="flex-1" />
        <span className="flex items-center">
          {g.members.slice(0, 3).map((m, i) => (
            <span
              key={i}
              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-semibold shrink-0"
              style={{
                background: m.bg,
                color: m.color,
                marginLeft: i > 0 ? -6 : 0,
                zIndex: 3 - i,
              }}
            >{m.initials}</span>
          ))}
          {g.moreMem ? (
            <span
              className="w-6 h-6 rounded-full border-2 border-white bg-[var(--color-bg-sunken)] flex items-center justify-center text-[9px] font-semibold text-[var(--color-text-quaternary)] shrink-0"
              style={{ marginLeft: -6 }}
            >+{g.moreMem}</span>
          ) : null}
        </span>
      </div>
    </Link>
  )
}

// ── Smart classify widget ────────────────────────────────────
function SmartClassifyCard() {
  return (
    <div className="col-span-1 md:col-span-2 xl:col-span-2 bg-white border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] p-5 flex flex-col gap-4 relative">
      {/* Arrow link indicator */}
      <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[var(--color-bg-sunken)] flex items-center justify-center">
        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
      </div>

      {/* Head */}
      <div className="flex items-start gap-3 pr-8">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-100)] flex items-center justify-center shrink-0">
          <Sun className="w-4.5 h-4.5 text-[var(--color-brand-700)]" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
            9 giao dịch mới chờ phân loại
          </h4>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
            Leo gợi ý nhóm dựa trên từ khóa đã học · xem trước trước khi áp dụng
          </p>
        </div>
      </div>

      {/* Preview rows */}
      <div className="flex flex-col gap-1.5">
        {MOCK_SMART_CLASSIFY.map((pv, i) => (
          <div key={i} className="flex items-center gap-2 py-[7px] px-3 rounded-lg bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] text-[12px]">
            <span className="text-[var(--color-text-secondary)] min-w-0 truncate flex-1">
              {pv.merchant} · <span className="font-medium text-[var(--color-brand-700)] bg-[var(--color-brand-50)] px-1 rounded">{pv.keyword}</span>{' '}{pv.suffix}
            </span>
            <span className="text-[var(--color-text-quaternary)] shrink-0">→</span>
            <span className="text-[var(--color-text-secondary)] shrink-0 flex items-center gap-1">
              <em className="not-italic">{pv.groupEmoji}</em> {pv.groupName}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)] mt-auto">
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          Độ tin cậy trung bình <b className="text-[var(--color-brand-700)]">96%</b>
        </span>
        <span className="flex-1" />
        <button className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer">
          Xem 6 cái khác
        </button>
        <button className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors cursor-pointer">
          <Check className="w-3 h-3" />
          Áp dụng tất cả
        </button>
      </div>
    </div>
  )
}

// ── Add group tile ───────────────────────────────────────────
function AddGroupTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-transparent border-2 border-dashed border-[var(--color-border-default)] rounded-[14px] p-6 flex flex-col items-center justify-center gap-3 text-center hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)] transition-all duration-200 group cursor-pointer w-full"
    >
      <div className="w-10 h-10 rounded-2xl bg-[var(--color-bg-sunken)] group-hover:bg-[var(--color-brand-100)] flex items-center justify-center transition-colors">
        <Plus className="w-5 h-5 text-[var(--color-text-quaternary)] group-hover:text-[var(--color-brand-700)] transition-colors" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">Tạo nhóm mới</h4>
        <p className="text-[11px] text-[var(--color-text-quaternary)] mt-1 leading-relaxed">
          Hoặc bắt đầu từ template: <b>Du lịch</b>, <b>Hộ gia đình</b>, <b>Đám cưới</b>…
        </p>
      </div>
    </button>
  )
}

// ── Archive strip ────────────────────────────────────────────
function ArchiveStrip() {
  return (
    <div className="col-span-full bg-white border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] p-4 flex items-center gap-6 flex-wrap">
      <div className="shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">Lưu trữ</div>
        <span className="inline-block mt-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">3</span>
      </div>
      <div className="flex items-center gap-4 flex-1 flex-wrap min-w-0">
        {MOCK_ARCHIVED.map(item => (
          <div key={item.name} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors">
            <span className="text-base">{item.emoji}</span>
            <span className="font-medium">{item.name}</span>
            <span className="font-mono text-[10px] text-[var(--color-text-quaternary)]">{item.date}</span>
          </div>
        ))}
      </div>
      <button className="shrink-0 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-sunken)]">
        Xem tất cả lưu trữ →
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main GroupsBentoPage
───────────────────────────────────────────────────────────── */
export function GroupsBentoPage() {
  const [activeTab, setActiveTab]   = React.useState('all')
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const { lang } = useSettingsStore()
  const { currentLedger } = useLedgerStore()

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── KPI strip ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
        {MOCK_KPI.map((kpi, i) => (
          <div
            key={kpi.label}
            className={cn(
              'px-4 lg:px-5 py-4',
              i < MOCK_KPI.length - 1 && 'border-b lg:border-b-0 lg:border-r border-[var(--color-border-subtle)]',
              i === 1 && 'border-r lg:border-r border-[var(--color-border-subtle)]',
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{kpi.label}</div>
            <div className="text-[22px] font-semibold tracking-[-0.022em] font-tabular mt-1 leading-tight">
              {kpi.value}<span className="text-[var(--color-text-tertiary)] font-medium text-sm">{kpi.unit}</span>
            </div>
            <div className={cn('text-[11px] mt-0.5', kpi.subLoss ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]')}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </section>

      {/* ── Filter row ── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Segmented control */}
        <div className="inline-flex bg-white border border-[var(--color-border-default)] rounded-[9px] p-0.5 shadow-xs flex-wrap gap-0.5">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'text-xs font-medium px-[11px] py-[5px] rounded-[6px] inline-flex items-center gap-[5px] cursor-pointer tracking-[-0.005em] transition-colors whitespace-nowrap',
                activeTab === tab.value
                  ? 'bg-[#111827] text-white'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
              )}
            >
              {tab.label}
              <span className={cn(
                'font-mono text-[9px] rounded px-[5px] py-px',
                activeTab === tab.value
                  ? 'bg-white/[0.16] text-white/[0.85]'
                  : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <span className="flex-1" />

        {/* Chip: Tài khoản */}
        <button className="inline-flex items-center gap-[5px] text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] transition-colors whitespace-nowrap">
          <Filter className="w-3 h-3" />
          Tài khoản: tất cả
          <ChevronDown className="w-2.5 h-2.5" />
        </button>

        {/* Chip: Sắp xếp */}
        <button className="inline-flex items-center gap-[5px] text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] transition-colors whitespace-nowrap">
          Sắp xếp: chi tiêu cao nhất
          <ChevronDown className="w-2.5 h-2.5" />
        </button>

        {/* View toggle: Bento */}
        <button className="inline-flex items-center gap-[5px] text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] transition-colors">
          <LayoutGrid className="w-3 h-3" />
          Bento
        </button>
      </div>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Featured */}
        <FeaturedCard />

        {/* 2. Dark stat 1 */}
        <DarkStatCard variant={1} />

        {/* 3. Dark stat 2 */}
        <DarkStatCard variant={2} />

        {/* 4. Group cards row 2: Chung cư + Gia đình */}
        <GroupCard g={MOCK_GROUPS[0]} />
        <GroupCard g={MOCK_GROUPS[1]} />

        {/* 5. Smart classify (wide) */}
        <SmartClassifyCard />

        {/* 6. Group cards row 3 */}
        <GroupCard g={MOCK_GROUPS[2]} />
        <GroupCard g={MOCK_GROUPS[3]} />
        <GroupCard g={MOCK_GROUPS[4]} />

        {/* 7. Add new */}
        <AddGroupTile onClick={() => setIsFormOpen(true)} />

        {/* 8. Archive strip (full width) */}
        <ArchiveStrip />
      </div>

      {/* ── Bottom insight strip ── */}
      <div
        className="flex items-center gap-3.5 p-[14px_18px] rounded-[14px] border border-[var(--color-brand-100)] shadow-[var(--shadow-card)]"
        style={{ background: 'linear-gradient(180deg,var(--color-brand-25) 0%,white 100%)' }}
      >
        <div className="w-9 h-9 rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0">
          <Sun className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold tracking-[-0.005em] text-[var(--color-text-primary)]">
            Đặt từ khóa cho nhóm giúp tự động phân loại 95% giao dịch trong tương lai
          </div>
          <div className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">
            Ví dụ: thêm "starbucks", "highlands" vào nhóm Cà phê → tự động phân loại mọi giao dịch chứa từ này
          </div>
        </div>
        <button className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors">
          Tìm hiểu
        </button>
        <button className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors">
          Mở quản lý từ khóa
        </button>
      </div>

      {/* Create group modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} maxWidth="2xl">
        <div className="p-2">
          <GroupForm lang={lang as any} onClose={() => setIsFormOpen(false)} />
        </div>
      </Modal>
    </div>
  )
}
