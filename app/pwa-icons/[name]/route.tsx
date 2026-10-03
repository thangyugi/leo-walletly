import { ImageResponse } from 'next/og'
import { BrandMark } from '@/features/pwa/brand-mark'
import { PWA_ICONS, type PwaIconName } from '@/features/pwa/config'

// Rendered once at build time: /pwa-icons/icon-192.png, icon-512.png, maskable-512.png.
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(PWA_ICONS).map((name) => ({ name }))
}

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const icon = PWA_ICONS[name as PwaIconName]
  return new ImageResponse(<BrandMark size={icon.size} maskable={icon.maskable} />, { width: icon.size, height: icon.size })
}
