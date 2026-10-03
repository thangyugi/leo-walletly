'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ArrowDownUp, FolderTree, Menu, Plus, PenLine, ScanLine, Upload, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuthStore } from '@/stores/auth'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { NAV_ITEMS, NAV_GROUP_LABEL_KEY, isActivePath } from './nav'
import { LanguagePicker } from './sidebar'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { InstallAppButton } from '@/features/pwa/components/install-app-button'

const TABS = [
  { href: '/', icon: LayoutDashboard, key: 'mobnav.dashboard' },
  { href: '/transactions', icon: ArrowDownUp, key: 'mobnav.transactions' },
  { href: '/categories', icon: FolderTree, key: 'mobnav.categories' },
]
// Everything reachable from the tab bar itself stays out of the "More" sheet.
const IN_TABS = new Set(['/', '/transactions', '/categories'])
const QUICK = new Set(['/calendar', '/analytics', '/scan', '/import'])

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <BottomSheet title={title} onClose={onClose} className="md:hidden bg-[var(--color-bg-canvas)]" bodyClassName="px-4">{children}</BottomSheet>
}

/**
 * Phone navigation: Home · Transactions · (+) · Categories · More.
 * "+" offers the three ways to add money records; "More" holds every other page.
 */
export function MobileTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, tk } = useTranslation()
  const can = useLedgerStore((s) => s.can)
  const signOut = useAuthStore((s) => s.signOut)
  const [sheet, setSheet] = useState<null | 'add' | 'more'>(null)
  const [adding, setAdding] = useState(false)
  const close = () => setSheet(null)

  // Leaving a page closes whatever sheet was open.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) { setLastPath(pathname); setSheet(null) }

  const moreActive = !TABS.some((tab) => isActivePath(pathname, tab.href)) && pathname !== '/'
  const tabClass = (on: boolean) => cn(
    'flex flex-col items-center justify-center gap-[3px] h-[52px] rounded-xl text-[10.5px] font-semibold tracking-[-0.01em]',
    on ? 'text-[var(--color-sidebar-item-active-text)]' : 'text-[var(--color-text-tertiary)]',
  )
  const tabLink = (tab: typeof TABS[number]) => {
    const on = isActivePath(pathname, tab.href)
    return (
      <Link key={tab.href} href={tab.href} aria-current={on ? 'page' : undefined} className={tabClass(on)}>
        <tab.icon className="w-[22px] h-[22px]" strokeWidth={on ? 2.2 : 1.8} />
        {tk(tab.key)}
      </Link>
    )
  }

  const addOptions = [
    { icon: PenLine, title: tk('mobnav.addTx'), sub: tk('mobnav.addTxSub'), onClick: () => { close(); setAdding(true) }, show: can('transaction.create') },
    { icon: ScanLine, title: tk('nav.scan'), sub: tk('mobnav.scanSub'), onClick: () => { close(); router.push('/scan') }, show: can('transaction.create') },
    { icon: Upload, title: tk('nav.import'), sub: tk('mobnav.importSub'), onClick: () => { close(); router.push('/import') }, show: can('import.create') },
  ].filter((o) => o.show)

  const quick = NAV_ITEMS.filter((n) => QUICK.has(n.href))
  const rest = (['manage', 'system'] as const).map((group) => ({
    group, items: NAV_ITEMS.filter((n) => n.group === group && !IN_TABS.has(n.href) && !QUICK.has(n.href)),
  }))

  return (
    <>
      <nav aria-label={tk('mobnav.menuTitle')}
        className="md:hidden fixed left-0 right-0 bottom-0 z-[150] grid grid-cols-5 items-center px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] bg-[var(--color-surface-default)]/95 backdrop-blur border-t border-[var(--color-border-default)] shadow-[0_-4px_16px_rgba(17,24,39,0.04)]">
        {tabLink(TABS[0])}
        {tabLink(TABS[1])}
        <div className="flex justify-center">
          <button type="button" onClick={() => setSheet('add')} aria-label={tk('mobnav.add')} aria-expanded={sheet === 'add'}
            className="-mt-5 w-[52px] h-[52px] rounded-[18px] bg-[var(--color-interactive-primary)] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(5,150,105,0.35),0_0_0_4px_var(--color-surface-default)]">
            <Plus className="w-6 h-6" strokeWidth={2.4} />
          </button>
        </div>
        {tabLink(TABS[2])}
        <button type="button" onClick={() => setSheet('more')} aria-expanded={sheet === 'more'} className={tabClass(moreActive || sheet === 'more')}>
          <Menu className="w-[22px] h-[22px]" strokeWidth={moreActive ? 2.2 : 1.8} />
          {tk('mobnav.more')}
        </button>
      </nav>

      {sheet === 'add' && (
        <Sheet title={tk('mobnav.addTitle')} onClose={close}>
          <div className="flex flex-col gap-2 pb-2">
            {addOptions.map((o) => (
              <button key={o.title} type="button" onClick={o.onClick}
                className="flex items-center gap-3 min-h-[60px] px-4 rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] text-left">
                <span className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0"><o.icon className="w-5 h-5" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-[var(--color-text-primary)]">{o.title}</span>
                  <span className="block text-xs text-[var(--color-text-tertiary)]">{o.sub}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)]" />
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === 'more' && (
        <Sheet title={tk('mobnav.more')} onClose={close}>
          <div className="grid grid-cols-4 gap-2">
            {quick.map(({ href, shortKey, icon: Icon }) => (
              <Link key={href} href={href} className={cn('flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border text-center',
                isActivePath(pathname, href) ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border-default)] bg-[var(--color-surface-default)]')}>
                <span className="w-9 h-9 rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center"><Icon className="w-[18px] h-[18px]" /></span>
                <span className="text-xs font-medium text-[var(--color-text-primary)]">{tk(shortKey)}</span>
              </Link>
            ))}
          </div>
          {rest.map(({ group, items }) => (
            <section key={group} className="mt-4">
              {NAV_GROUP_LABEL_KEY[group] && <h3 className="mb-1.5 ml-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-quaternary)]">{tk(NAV_GROUP_LABEL_KEY[group]!)}</h3>}
              <div className="rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] overflow-hidden divide-y divide-[var(--color-border-subtle)]">
                {items.map(({ href, labelKey, icon: Icon }) => (
                  <Link key={href} href={href} aria-current={isActivePath(pathname, href) ? 'page' : undefined}
                    className="flex items-center gap-3 min-h-[52px] px-4 text-[14.5px] font-medium text-[var(--color-text-primary)]">
                    <Icon className="w-[18px] h-[18px] text-[var(--color-text-tertiary)]" />
                    <span className="flex-1">{tk(labelKey)}</span>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)]" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
          <div className="mt-4 empty:hidden"><InstallAppButton variant="row" /></div>
          <section className="mt-4">
            <h3 className="mb-1.5 ml-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-quaternary)]">{t.common.language}</h3>
            <div className="p-1 rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)]"><LanguagePicker /></div>
          </section>
          <button type="button"
            onClick={async () => { close(); await signOut(); useLedgerStore.getState().reset(); router.replace('/login') }}
            className="mt-4 mb-2 w-full h-12 rounded-2xl border border-[var(--color-status-loss-bg)] bg-[var(--color-surface-default)] text-sm font-semibold text-[var(--color-text-loss)] flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />{t.common.signOut}
          </button>
        </Sheet>
      )}

      {adding && <TransactionEditModal txn={null} onClose={() => setAdding(false)} />}
    </>
  )
}
