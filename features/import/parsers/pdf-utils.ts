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

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  const lib = await import('pdfjs-dist')
  lib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href
  pdfjsLib = lib
  return lib
}

/** Extract structured text from a PDF file with CJK Japanese support */
export async function extractPdfText(file: File): Promise<PdfPage[]> {
  const pdfjs = await getPdfjs()
  const buffer = await file.arrayBuffer()

  const pdf = await pdfjs.getDocument({
    data: buffer,
    // CRITICAL: required for Japanese CJK font encoding
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    useSystemFonts: true,
  }).promise

  const pages: PdfPage[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const rawItems: PdfTextItem[] = []

    for (const item of content.items) {
      if (!('str' in item) || !('transform' in item)) continue
      const str = (item as { str: string }).str
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
