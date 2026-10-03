import { PWA } from './config'

// lucide "wallet" (the logo in the sidebar), 24×24 viewBox.
const WALLET_PATHS = [
  'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
  'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
]

/**
 * The app icon as an `ImageResponse` tree: white wallet on brand green.
 * `maskable` fills the whole square and keeps the glyph inside the 80% safe
 * zone, since launchers crop maskable icons to their own shape.
 */
export function BrandMark({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const glyph = Math.round(size * (maskable ? 0.42 : 0.5))
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: maskable ? PWA.brandColor : 'transparent' }}>
      <div
        style={{
          width: maskable ? size : Math.round(size * 0.875),
          height: maskable ? size : Math.round(size * 0.875),
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
          background: PWA.brandColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
          {WALLET_PATHS.map((d) => <path key={d} d={d} />)}
        </svg>
      </div>
    </div>
  )
}
