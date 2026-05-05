/**
 * Shared PDF text extraction utilities using pdfjs-dist.
 * Only runs in browser (client components).
 */

export interface PdfTextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
  page: number
}

export interface PdfLine {
  items: PdfTextItem[]
  text: string
  y: number
  page: number
}

export interface PdfPage {
  lines: PdfLine[]
  pageNumber: number
  rawItems: PdfTextItem[]
}

let pdfjsInitialized = false

async function initPdfjs() {
  if (pdfjsInitialized) return
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  pdfjsInitialized = true
}

/**
 * Extract structured text from a PDF file.
 * Groups text items into lines by Y-position proximity.
 */
export async function extractPdfText(file: File): Promise<PdfPage[]> {
  await initPdfjs()
  const pdfjs = await import('pdfjs-dist')

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise

  const pages: PdfPage[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const rawItems: PdfTextItem[] = content.items
      .filter((item): item is (typeof item & { str: string; transform: number[]; width?: number; height?: number }) => 'str' in item && 'transform' in item)
      .filter((item) => item.str.trim().length > 0)
      .map((item) => ({
        text: item.str,
        x: Math.round(item.transform[4]),
        // Flip Y axis: PDF uses bottom-left origin, we want top-left
        y: Math.round(viewport.height - item.transform[5]),
        width: Math.round(item.width ?? 0),
        height: Math.round(item.height ?? 10),
        page: pageNum,
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x)

    // Group items into lines (items within Y_THRESHOLD px of each other = same line)
    const Y_THRESHOLD = 3
    const lineMap: Map<number, PdfTextItem[]> = new Map()

    for (const item of rawItems) {
      let foundKey: number | undefined
      for (const key of lineMap.keys()) {
        if (Math.abs(item.y - key) <= Y_THRESHOLD) {
          foundKey = key
          break
        }
      }
      const lineKey = foundKey ?? item.y
      const existing = lineMap.get(lineKey) ?? []
      lineMap.set(lineKey, [...existing, item])
    }

    const lines: PdfLine[] = Array.from(lineMap.entries())
      .sort(([ya], [yb]) => ya - yb)
      .map(([y, items]) => {
        const sorted = [...items].sort((a, b) => a.x - b.x)
        return {
          items: sorted,
          text: sorted.map((i) => i.text).join(' ').replace(/\s+/g, ' ').trim(),
          y,
          page: pageNum,
        }
      })

    pages.push({ lines, pageNumber: pageNum, rawItems })
  }

  return pages
}

/** Get all lines across all pages as a flat array */
export function flatLines(pages: PdfPage[]): PdfLine[] {
  return pages.flatMap((p) => p.lines)
}

/** Clean a Japanese amount string → number */
export function parseJpAmount(raw: string): number | null {
  const cleaned = raw.replace(/[¥￥,，\s円]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/** Detect if a string looks like a Japanese date (MM/DD or YYYY/MM/DD) */
export const DATE_RE = /^(\d{1,4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})[日]?$/
export const MONTH_DAY_RE = /^(\d{1,2})\/(\d{1,2})$/

export function parseJpDate(raw: string, yearHint?: number): string | null {
  const clean = raw.trim()

  // Full date: YYYY/MM/DD or YYYY年MM月DD日
  const full = clean.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/)
  if (full) {
    const [, y, m, d] = full
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Short date: MM/DD (year inferred)
  const short = clean.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (short) {
    const [, m, d] = short
    const year = yearHint ?? new Date().getFullYear()
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

/** Extract year hint from PDF text (e.g. "2026年4月分") */
export function extractYearHint(pages: PdfPage[]): number {
  for (const page of pages) {
    for (const line of page.lines) {
      const m = line.text.match(/(\d{4})年/)
      if (m) return parseInt(m[1])
    }
  }
  return new Date().getFullYear()
}
