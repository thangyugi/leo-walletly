import { spawnSync } from 'node:child_process'
import { createSerwistRoute } from '@serwist/turbopack'

// Revision of the offline page in the precache: the commit being built
// (Vercel exposes it), so each deploy refreshes it.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  crypto.randomUUID()

// Builds features/pwa/worker/sw.ts with esbuild and serves it at /serwist/sw.js
// (static, generated at build time).
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'features/pwa/worker/sw.ts',
  additionalPrecacheEntries: [{ url: '/offline', revision }],
  useNativeEsbuild: true,
  // Large, rarely used chunks (pdf.js worker, CMaps) are fetched on demand instead.
  globIgnores: ['**/*.map', '**/pdf.worker*', '**/cmaps/**'],
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
})
