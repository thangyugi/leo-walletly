'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, LayoutDashboard, ArrowDownUp, Upload, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'

const NAV_ITEMS = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/transactions', label: '明細', icon: ArrowDownUp },
  { href: '/import', label: 'インポート', icon: Upload },
  { href: '/analytics', label: '分析', icon: BarChart3 },
]

export function MobileHeader() {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar */}
      <header className="md:hidden flex items-center gap-2 px-4 h-14 bg-white border-b border-border sticky top-0 z-30">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
          <Wallet className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-text-primary text-sm tracking-tight">{APP_NAME}</span>
      </header>

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
                active ? 'text-brand-600' : 'text-text-muted'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
