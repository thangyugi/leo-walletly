import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/header'
import { AuthProvider } from '@/components/auth/auth-provider'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Leo Walletly',
  description: '収支管理・家計簿アプリ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface">
        <AuthProvider>
          <div className="flex min-h-screen bg-surface">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <MobileHeader />
              <main className="flex-1 p-4">{children}</main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
