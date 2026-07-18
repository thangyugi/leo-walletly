'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/i18n'
import { useTranslation } from '@/hooks/useTranslation'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export type DatePickerMode = 'day' | 'month' | 'quarter' | 'year'

export interface PickerValue {
  start: string       // YYYY-MM-DD
  end:   string       // YYYY-MM-DD
  mode:  DatePickerMode
  label: string
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function todayStr() { return new Date().toISOString().split('T')[0] }

function dStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m: m - 1, d }
}

function firstOfMonth(y: number, m: number) { return dStr(y, m, 1) }

function lastOfMonth(y: number, m: number) {
  return dStr(y, m, new Date(y, m + 1, 0).getDate())
}

export function buildLabel(start: string, end: string, mode: DatePickerMode, lang: Lang): string {
  const s = parseDate(start)
  if (lang === 'vi') {
    const fmtD = (p: { y: number; m: number; d: number }) =>
      `${String(p.d).padStart(2, '0')}/${String(p.m + 1).padStart(2, '0')}/${p.y}`
    if (start === end) return fmtD(s)
    const e = parseDate(end)
    return `${fmtD(s)} - ${fmtD(e)}`
  }
  if (mode === 'year') return `${s.y}`
  if (mode === 'quarter') {
    const q = Math.floor(s.m / 3) + 1
    return `Q${q} ${s.y}`
  }
  if (mode === 'month' || start.slice(0, 7) === end.slice(0, 7)) {
    const MONTH_SHORT = {
      ja: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
      en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    }
    return `${MONTH_SHORT[lang][s.m]} ${s.y}`
  }
  // day / custom range
  const e = parseDate(end)
  if (start === end) {
    if (lang === 'ja') return `${s.y}年${s.m + 1}月${s.d}日`
    return new Date(start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (lang === 'ja') return `${s.m + 1}/${s.d} 〜 ${e.m + 1}/${e.d}`
  const fmt = (str: string) => new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

/** Today's date as a PickerValue in month mode */
export function defaultPickerValue(lang: Lang): PickerValue {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = firstOfMonth(y, m)
  const end   = lastOfMonth(y, m)
  return { start, end, mode: 'month', label: buildLabel(start, end, 'month', lang) }
}

// ------------------------------------------------------------------
// Locale data
// ------------------------------------------------------------------
const WEEKDAYS: Record<Lang, string[]> = {
  ja: ['日','月','火','水','木','金','土'],
  vi: ['CN','T2','T3','T4','T5','T6','T7'],
  en: ['S','M','T','W','T','F','S'],
}

const MONTHS_LONG: Record<Lang, string[]> = {
  ja: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  vi: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
}

const MODE_TAB: Record<Lang, Record<DatePickerMode, string>> = {
  ja: { day: '日', month: '月', quarter: '四半期', year: '年' },
  vi: { day: 'Ngày', month: 'Tháng', quarter: 'Quý', year: 'Năm' },
  en: { day: 'Day', month: 'Month', quarter: 'Quarter', year: 'Year' },
}

// ------------------------------------------------------------------
// Day-mode calendar grid
// ------------------------------------------------------------------
function DayCalendar({
  navYear, navMonth, rangeStart, rangeEnd, hoverDate,
  onDayClick, onDayHover, onDayLeave, lang,
}: {
  navYear: number; navMonth: number
  rangeStart: string | null; rangeEnd: string | null; hoverDate: string | null
  onDayClick: (d: string) => void
  onDayHover: (d: string) => void
  onDayLeave: () => void
  lang: Lang
}) {
  const firstWD    = new Date(navYear, navMonth, 1).getDay()
  const daysInMo   = new Date(navYear, navMonth + 1, 0).getDate()
  const cells      = [...Array(firstWD).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)]
  const today      = todayStr()

  function inRange(d: string) {
    const e = rangeEnd ?? hoverDate
    if (!rangeStart || !e) return false
    const [lo, hi] = rangeStart <= e ? [rangeStart, e] : [e, rangeStart]
    return d > lo && d < hi
  }

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS[lang].map((wd, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-[var(--color-text-quaternary)] py-1">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const d   = dStr(navYear, navMonth, day)
          const isS = d === rangeStart
          const isE = rangeEnd ? d === rangeEnd : (rangeStart && d === hoverDate && d !== rangeStart)
          const rng = inRange(d)
          const isTd = d === today
          return (
            <button
              key={d}
              onClick={() => onDayClick(d)}
              onMouseEnter={() => onDayHover(d)}
              onMouseLeave={onDayLeave}
              className={cn(
                'h-8 w-full flex items-center justify-center text-xs rounded-md transition-all duration-75',
                (isS || isE) && 'bg-[var(--color-interactive-primary)] text-white font-semibold z-10',
                rng && !isS && !isE && 'bg-[var(--color-status-gain-bg)] rounded-none',
                !isS && !isE && !rng && 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]',
                isTd && !isS && !isE && 'ring-1 ring-[var(--color-interactive-primary)] text-[var(--color-interactive-primary)] font-semibold'
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// DateRangePicker
// ------------------------------------------------------------------
export function DateRangePicker({
  value, onChange, onClose, lang = 'en',
}: {
  value: PickerValue
  onChange: (v: PickerValue) => void
  onClose: () => void
  lang?: Lang
}) {
  const { t } = useTranslation()
  const { y: initY, m: initM } = parseDate(value.start)
  const [mode,       setMode]       = useState<DatePickerMode>(value.mode)
  const [navYear,    setNavYear]    = useState(initY)
  const [navMonth,   setNavMonth]   = useState(initM)
  const [rangeStart, setRangeStart] = useState<string | null>(value.start)
  const [rangeEnd,   setRangeEnd]   = useState<string | null>(value.end !== value.start ? value.end : null)
  const [hoverDate,  setHoverDate]  = useState<string | null>(null)
  const [step,       setStep]       = useState<0 | 1>(0) // 0=pick start, 1=pick end

  const presets = [
    { label: t.datepicker.today,       get: () => { const t_ = todayStr(); return { start: t_, end: t_, mode: 'day' as const, label: buildLabel(t_, t_, 'day', lang) } } },
    { label: t.datepicker.thisWeek,    get: () => { const now = new Date(); const sun = new Date(now); sun.setDate(now.getDate() - now.getDay()); const sat = new Date(sun); sat.setDate(sun.getDate() + 6); const s = sun.toISOString().split('T')[0]; const e = sat.toISOString().split('T')[0]; return { start: s, end: e, mode: 'day' as const, label: buildLabel(s, e, 'day', lang) } } },
    { label: t.datepicker.thisMonth,   get: () => { const now = new Date(); const s = firstOfMonth(now.getFullYear(), now.getMonth()); const e = lastOfMonth(now.getFullYear(), now.getMonth()); return { start: s, end: e, mode: 'month' as const, label: buildLabel(s, e, 'month', lang) } } },
    { label: t.datepicker.lastMonth,   get: () => { const now = new Date(); let m = now.getMonth(), y = now.getFullYear(); if (m === 0) { m = 11; y--; } else m--; const s = firstOfMonth(y, m); const e = lastOfMonth(y, m); return { start: s, end: e, mode: 'month' as const, label: buildLabel(s, e, 'month', lang) } } },
    { label: t.datepicker.thisQuarter, get: () => { const now = new Date(); const q = Math.floor(now.getMonth() / 3); const s = firstOfMonth(now.getFullYear(), q * 3); const e = lastOfMonth(now.getFullYear(), q * 3 + 2); return { start: s, end: e, mode: 'quarter' as const, label: buildLabel(s, e, 'quarter', lang) } } },
    { label: t.datepicker.thisYear,    get: () => { const y = new Date().getFullYear(); const s = `${y}-01-01`; const e = `${y}-12-31`; return { start: s, end: e, mode: 'year' as const, label: buildLabel(s, e, 'year', lang) } } },
    { label: t.datepicker.lastYear,    get: () => { const y = new Date().getFullYear() - 1; const s = `${y}-01-01`; const e = `${y}-12-31`; return { start: s, end: e, mode: 'year' as const, label: buildLabel(s, e, 'year', lang) } } },
  ]

  const modeLabels = MODE_TAB[lang]
  const months     = MONTHS_LONG[lang]

  function handleDayClick(d: string) {
    if (step === 0) { setRangeStart(d); setRangeEnd(null); setStep(1) }
    else {
      let s = rangeStart!, e = d
      if (e < s) [s, e] = [e, s]
      setRangeStart(s); setRangeEnd(e); setStep(0)
    }
  }

  function handleApply() {
    const s = rangeStart ?? todayStr()
    const e = rangeEnd   ?? s
    const label = buildLabel(s, e, mode, lang)
    onChange({ start: s, end: e, mode, label })
    onClose()
  }

  function handlePreset(p: typeof presets[0]) {
    const v = p.get(); onChange(v); onClose()
  }

  function prevNav() {
    if (mode === 'day') {
      if (navMonth === 0) { setNavYear(y => y - 1); setNavMonth(11) } else setNavMonth(m => m - 1)
    } else setNavYear(y => y - (mode === 'year' ? 10 : 1))
  }

  function nextNav() {
    if (mode === 'day') {
      if (navMonth === 11) { setNavYear(y => y + 1); setNavMonth(0) } else setNavMonth(m => m + 1)
    } else setNavYear(y => y + (mode === 'year' ? 10 : 1))
  }

  const navLabel = mode === 'day'
    ? `${MONTHS_LONG[lang][navMonth]} ${navYear}`
    : mode === 'year' ? `${navYear - 4} – ${navYear + 5}` : `${navYear}`

  return (
    <div className="flex w-[520px] max-w-[95vw]">
      {/* Presets sidebar */}
      <div className="w-36 border-r border-[var(--color-border-subtle)] py-2 shrink-0 bg-[var(--color-bg-sunken)]">
        <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)]">
          {t.datepicker.quick}
        </p>
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p)}
            className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Calendar area */}
      <div className="flex-1 p-4">
        {/* Mode tabs */}
        <div className="flex items-center gap-0.5 p-0.5 bg-[var(--color-bg-sunken)] rounded-lg mb-4">
          {(['day', 'month', 'quarter', 'year'] as DatePickerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 py-1 text-xs font-medium rounded-md transition-all',
                mode === m
                  ? 'bg-[var(--color-surface-default)] text-[var(--color-text-primary)] shadow-xs'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>

        {/* Nav header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevNav} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-sunken)] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
          </button>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{navLabel}</span>
          <button onClick={nextNav} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-sunken)] transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        {/* Day view */}
        {mode === 'day' && (
          <>
            <DayCalendar
              navYear={navYear} navMonth={navMonth}
              rangeStart={rangeStart} rangeEnd={rangeEnd} hoverDate={hoverDate}
              onDayClick={handleDayClick} onDayHover={setHoverDate} onDayLeave={() => setHoverDate(null)}
              lang={lang}
            />
            {step === 1 && (
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2 text-center animate-fade-in">
                {t.datepicker.selectEndDate}
              </p>
            )}
            <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
              <button onClick={onClose} className="flex-1 py-1.5 text-xs border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] transition-colors">
                {t.datepicker.cancel}
              </button>
              <button
                onClick={handleApply}
                disabled={!rangeStart}
                className="flex-1 py-1.5 text-xs font-semibold bg-[var(--color-interactive-primary)] text-white rounded-lg hover:bg-[var(--color-interactive-primary-hover)] transition-colors disabled:opacity-40"
              >
                {t.datepicker.apply}
              </button>
            </div>
          </>
        )}

        {/* Month view */}
        {mode === 'month' && (
          <div className="grid grid-cols-3 gap-1.5">
            {months.map((ml, mi) => {
              const sel = value.start.startsWith(`${navYear}-${String(mi + 1).padStart(2, '0')}`)
              return (
                <button
                  key={mi}
                  onClick={() => {
                    const s = firstOfMonth(navYear, mi); const e = lastOfMonth(navYear, mi)
                    onChange({ start: s, end: e, mode: 'month', label: buildLabel(s, e, 'month', lang) })
                    onClose()
                  }}
                  className={cn(
                    'py-2.5 text-xs rounded-lg transition-all font-medium',
                    sel ? 'bg-[var(--color-interactive-primary)] text-white'
                        : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]',
                    mi === new Date().getMonth() && navYear === new Date().getFullYear() && !sel &&
                      'ring-1 ring-[var(--color-interactive-primary)]'
                  )}
                >
                  {ml}
                </button>
              )
            })}
          </div>
        )}

        {/* Quarter view */}
        {mode === 'quarter' && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[0, 1, 2, 3].map((q) => {
              const qs  = firstOfMonth(navYear, q * 3)
              const qe  = lastOfMonth(navYear, q * 3 + 2)
              const sel = value.start >= qs && value.start <= qe
              const qLabel   = t.datepicker.quarterLabel.replace('{{q}}', String(q + 1))
              const subLabel = `${MONTHS_LONG[lang][q * 3]} – ${MONTHS_LONG[lang][q * 3 + 2]}`
              return (
                <button
                  key={q}
                  onClick={() => {
                    onChange({ start: qs, end: qe, mode: 'quarter', label: buildLabel(qs, qe, 'quarter', lang) })
                    onClose()
                  }}
                  className={cn(
                    'py-3 px-4 rounded-xl text-left transition-all border',
                    sel ? 'bg-[var(--color-interactive-primary)] text-white border-transparent'
                        : 'border-[var(--color-border-default)] hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)]'
                  )}
                >
                  <p className={cn('text-sm font-bold', sel ? 'text-white' : 'text-[var(--color-text-primary)]')}>{qLabel}</p>
                  <p className={cn('text-[10px] mt-0.5', sel ? 'text-white/70' : 'text-[var(--color-text-quaternary)]')}>{subLabel}</p>
                </button>
              )
            })}
          </div>
        )}

        {/* Year view */}
        {mode === 'year' && (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => navYear - 4 + i).map((yr) => {
              const sel = value.start.startsWith(`${yr}`)
              const isCurrentYear = yr === new Date().getFullYear()
              return (
                <button
                  key={yr}
                  onClick={() => {
                    const s = `${yr}-01-01`; const e = `${yr}-12-31`
                    onChange({ start: s, end: e, mode: 'year', label: `${yr}` })
                    onClose()
                  }}
                  className={cn(
                    'py-2.5 text-xs rounded-lg transition-all font-medium',
                    sel ? 'bg-[var(--color-interactive-primary)] text-white'
                        : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]',
                    isCurrentYear && !sel && 'ring-1 ring-[var(--color-interactive-primary)]'
                  )}
                >
                  {yr}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// DateNavigator — ◀ | label | ▶ trigger
// ------------------------------------------------------------------
export function DateNavigator({
  value, onChange, lang = 'en',
}: {
  value: PickerValue
  onChange: (v: PickerValue) => void
  lang?: Lang
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function navigate(dir: -1 | 1) {
    const { start, end, mode } = value
    const s = parseDate(start)
    let ns: string, ne: string

    if (mode === 'day') {
      const d = new Date(start + 'T00:00:00'); d.setDate(d.getDate() + dir)
      ns = ne = d.toISOString().split('T')[0]
    } else if (mode === 'month') {
      const nm = s.m + dir; const ny = s.y + Math.floor(nm < 0 ? -1 : nm > 11 ? 1 : 0)
      const fm = ((nm % 12) + 12) % 12
      ns = firstOfMonth(ny, fm); ne = lastOfMonth(ny, fm)
    } else if (mode === 'quarter') {
      const q = Math.floor(s.m / 3); const nq = q + dir
      const ny = s.y + (nq < 0 ? -1 : nq > 3 ? 1 : 0)
      const fq = ((nq % 4) + 4) % 4
      ns = firstOfMonth(ny, fq * 3); ne = lastOfMonth(ny, fq * 3 + 2)
    } else {
      ns = `${s.y + dir}-01-01`; ne = `${s.y + dir}-12-31`
    }

    onChange({ start: ns, end: ne, mode, label: buildLabel(ns, ne, mode, lang) })
  }

  const label = value.label || buildLabel(value.start, value.end, value.mode, lang)

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] border border-transparent hover:border-[var(--color-border-default)] transition-all"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-tertiary)]" />
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'h-8 px-3 flex items-center gap-1.5 rounded-lg border transition-all min-w-[200px] justify-center',
            open
              ? 'bg-[var(--color-status-gain-bg)] border-[var(--color-interactive-primary)] text-[var(--color-interactive-primary)]'
              : 'bg-[var(--color-surface-default)] border-[var(--color-border-default)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]'
          )}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0 opacity-60" />
          <span className="text-sm font-semibold">{label}</span>
        </button>

        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] border border-transparent hover:border-[var(--color-border-default)] transition-all"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
        </button>
      </div>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[300] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl overflow-hidden animate-slide-in-up">
          <DateRangePicker
            value={value}
            onChange={(v) => { onChange(v); setOpen(false) }}
            onClose={() => setOpen(false)}
            lang={lang}
          />
        </div>
      )}
    </div>
  )
}
