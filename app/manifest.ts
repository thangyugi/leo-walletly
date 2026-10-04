import type { MetadataRoute } from 'next'
import { PWA, PWA_ICONS } from '@/features/pwa/config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: PWA.name,
    short_name: PWA.shortName,
    description: PWA.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: PWA.backgroundColor,
    theme_color: PWA.brandColor,
    categories: ['finance', 'productivity'],
    icons: Object.entries(PWA_ICONS).map(([name, icon]) => ({
      src: `/pwa-icons/${name}`,
      sizes: `${icon.size}x${icon.size}`,
      type: 'image/png',
      purpose: icon.maskable ? 'maskable' : 'any',
    })),
    // Long-press the home-screen icon.
    shortcuts: [
      { name: 'Add transaction', short_name: 'Add', url: '/transactions?new=1', icons: [{ src: '/pwa-icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Scan receipt', short_name: 'Scan', url: '/scan', icons: [{ src: '/pwa-icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Transactions', short_name: 'Transactions', url: '/transactions', icons: [{ src: '/pwa-icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
