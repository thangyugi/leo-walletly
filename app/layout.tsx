import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/layout/shell'
import { AuthProvider } from '@/components/auth/auth-provider'
import { CurrencyInitializer } from '@/features/currency/components/CurrencyInitializer'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Leo Walletly', template: '%s · Leo Walletly' },
  description: 'Enterprise personal finance management — track, categorize, and analyze your spending.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full bg-[var(--color-bg-base)] text-[var(--color-text-primary)] antialiased">
        <AuthProvider>
          <CurrencyInitializer />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
