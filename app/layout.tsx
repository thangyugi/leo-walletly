import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/layout/shell'
import { AuthProvider } from '@/components/auth/auth-provider'
import { CurrencyInitializer } from '@/features/currency/components/CurrencyInitializer'
import { Toaster } from 'sonner'
import { PwaProvider } from '@/features/pwa/components/pwa-provider'
import { PWA, INSTALL_PROMPT_CAPTURE } from '@/features/pwa/config'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: PWA.name, template: `%s · ${PWA.name}` },
  description: PWA.description,
  applicationName: PWA.name,
  // The manifest link comes from app/manifest.ts, the iOS icon from app/apple-icon.tsx.
  appleWebApp: { capable: true, title: PWA.shortName, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // lets the layout use env(safe-area-inset-*) on notched phones
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: PWA.themeColor.light },
    { media: '(prefers-color-scheme: dark)', color: PWA.themeColor.dark },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE }} />
      </head>
      <body className="h-full bg-[var(--color-bg-base)] text-[var(--color-text-primary)] antialiased">
        <AuthProvider>
          <CurrencyInitializer />
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <PwaProvider />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  )
}
