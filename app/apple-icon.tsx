import { ImageResponse } from 'next/og'
import { BrandMark } from '@/features/pwa/brand-mark'

// iOS home-screen icon. iOS rounds the corners itself, so it gets the full-bleed version.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<BrandMark size={180} maskable />, size)
}
