import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/header'
import { AuthProvider } from '@/components/auth/auth-provider'

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
          <div className="flex h-full min-h-screen">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <MobileHeader />
              <main className="flex-1 overflow-auto">
                <div className="px-4 md:px-6 py-6 max-w-[1360px] mx-auto w-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
