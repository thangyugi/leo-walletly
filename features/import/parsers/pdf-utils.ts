/**
 * Shared PDF text extraction utilities using pdfjs-dist.
 * Only runs in browser (client components).
 *
 * KEY: Japanese PDFs (Rakuten, PayPay) use CJK CMap encodings.
 * Without cMapUrl, text extraction returns empty/garbage.
 */

export interface PdfTextItem {
  text: string
  x: number
  y: number
  page: number
}

export interface PdfLine {
  items: PdfTextItem[]
  text: string       // Joined, normalized text
  rawText: string    // Joined without normalization
  y: number
  page: number
}

export interface PdfPage {
  lines: PdfLine[]
  pageNumber: number
  rawItems: PdfTextItem[]
}

let pdfjsLib: typeof import('pdfjs-dist') | null = null

// The "legacy" build carries polyfills: the modern one needs Promise.try /
// Promise.withResolvers (Safari 18.2+, Chrome 128+) and fails on older phones.
async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  const lib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as typeof import('pdfjs-dist')
  lib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url
  ).href
  pdfjsLib = lib
  return lib
}

/** The PDF is protected: ask for its password and call again with it. */
export class PdfPasswordError extends Error {
  constructor(public wrongPassword: boolean) { super(wrongPassword ? 'PDF_PASSWORD_WRONG' : 'PDF_PASSWORD') }
}

/** Extract structured text from a PDF file with CJK Japanese support */
export async function extractPdfText(file: File, password?: string): Promise<PdfPage[]> {
  const pdfjs = await getPdfjs()
  const buffer = await file.arrayBuffer()

  let pdf
  try {
    pdf = await pdfjs.getDocument({
      data: buffer,
      password,
      // CRITICAL: required for Japanese CJK font encoding
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      useSystemFonts: true,
    }).promise
  } catch (e) {
    const err = e as { name?: string; code?: number }
    // pdf.js: PasswordException code 1 = needs a password, 2 = wrong password.
    if (err?.name === 'PasswordException') throw new PdfPasswordError(err.code === 2)
    throw e
  }

  const pages: PdfPage[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const rawItems: PdfTextItem[] = []

    for (const item of content.items) {
      if (!('str' in item) || !('transform' in item)) continue
      // Full-width digits / slashes / letters (２０２６／０４) read as their ASCII forms.
      const str = (item as { str: string }).str.normalize('NFKC')
      if (!str.trim()) continue
      const transform = (item as { transform: number[] }).transform
      rawItems.push({
        text: str,
        x: Math.round(transform[4]),
        y: Math.round(viewport.height - transform[5]),
        page: pageNum,
      })
    }

    // Sort all items top-to-bottom, then left-to-right
    rawItems.sort((a, b) => a.y - b.y || a.x - b.x)

    // Group items into lines by Y-position proximity
    // Threshold: 8px to handle slight baseline variations in table rows
    const Y_THRESHOLD = 8
    const lineMap = new Map<number, PdfTextItem[]>()

    for (const item of rawItems) {
      let foundKey: number | undefined
      for (const key of lineMap.keys()) {
        if (Math.abs(item.y - key) <= Y_THRESHOLD) {
          foundKey = key
          break
        }
      }
      const k = foundKey ?? item.y
      lineMap.set(k, [...(lineMap.get(k) ?? []), item])
    }

    const lines: PdfLine[] = Array.from(lineMap.entries())
      .sort(([ya], [yb]) => ya - yb)
      .map(([y, items]) => {
        const sorted = [...items].sort((a, b) => a.x - b.x)
        const rawText = sorted.map((i) => i.text).join(' ')
        const text = normalizeAmounts(rawText)
          .replace(/\s{2,}/g, ' ')
          .trim()
        return { items: sorted, text, rawText, y, page: pageNum }
      })

    pages.push({ lines, pageNumber: pageNum, rawItems })
  }

  return pages
}

/** Get all lines across all pages as flat array */
export function flatLines(pages: PdfPage[]): PdfLine[] {
  return pages.flatMap((p) => p.lines)
}

/**
 * Normalize amounts: recombine numbers split by commas across text items.
 * e.g.  "3, 435"  →  "3435"
 *        "3 , 435"  →  "3435"
 *        "2, 640"  →  "2640"
 */
export function normalizeAmounts(text: string): string {
  return text
    .replace(/(\d)\s*,\s*(\d{3})\b/g, '$1$2')  // "3, 435" → "3435"
    .replace(/(\d),(\d{3})\b/g, '$1$2')          // "3,435"  → "3435"
}

/** Parse Japanese date string → ISO date string */
export function parseJpDate(raw: string, yearHint?: number): string | null {
  const clean = raw.trim()
  // YYYY/MM/DD or YYYY-MM-DD
  const full = clean.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (full) {
    const [, y, m, d] = full
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // MM/DD (year inferred)
  const short = clean.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (short) {
    const [, m, d] = short
    const year = yearHint ?? new Date().getFullYear()
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

/** Extract year from PDF text e.g. "2026年4月" */
export function extractYearHint(pages: PdfPage[]): number {
  for (const page of pages) {
    for (const line of page.lines) {
      const m = line.text.match(/(\d{4})年/)
      if (m) return parseInt(m[1])
    }
  }
  return new Date().getFullYear()
}

/** Clean Japanese amount string → number */
export function parseJpAmount(raw: string): number | null {
  const cleaned = raw.replace(/[¥￥,，\s円]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/** The whole text, one line per row (for detecting what the PDF is). */
export function pdfPlainText(pages: PdfPage[]): string {
  return flatLines(pages).map((l) => l.text).join('\n')
}

/**
 * Which statement is this PDF? Decided by its own words, not its file name.
 * Card names vary (楽天カード, 楽天ゴールドカード, 楽天プレミアムカード, Rakuten Card…).
 */
export type PdfKind = 'rakuten_card' | 'paypay_card' | 'paypay' | null
export function detectPdfKind(text: string): PdfKind {
  const t = text.replace(/\s+/g, '')
  if (/PayPayカード|PayPayCard/i.test(t)) return 'paypay_card'
  if (/楽天[^\n]{0,12}?カード|RakutenCard|楽天e-?NAVI|楽天カード株式会社/i.test(t)) return 'rakuten_card'
  if (/PayPay|ペイペイ/i.test(t) && /取引|残高|支払い/.test(t)) return 'paypay'
  return null
}

/**
 * Japanese amount tokens in a piece of text, in order: 1,234 · ¥1,234 · 1234円
 * · -1,234 · ▲1,234 / △1,234 (Japanese minus). Numbers glued to a unit
 * that is not money (1回払い, 3月) are skipped.
 */
export function amountsIn(text: string): number[] {
  const out: number[] = []
  const re = /([-−▲△]?)[¥￥]?\s?(\d{1,3}(?:,\d{3})+|\d+)(円)?(?![\d回月日年件%])/g
  for (const m of text.matchAll(re)) {
    const n = parseInt(m[2].replace(/,/g, ''), 10)
    if (Number.isNaN(n)) continue
    out.push(m[1] ? -n : n)
  }
  return out
}
