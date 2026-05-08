import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('MISSING_API_KEY')
  }
  return new GoogleGenAI({ apiKey })
}

// Models with confirmed free-tier quota (based on ai.dev/rate-limit)
// Gemini 2.0 models have 0 quota for this key — use 2.5+ only
const MODELS = [
  'gemini-2.5-flash-lite-preview-06-17', // 10 RPM — Gemini 2.5 Flash Lite
  'gemini-2.5-flash-preview-04-17',       // 5 RPM  — Gemini 2.5 Flash
  'gemini-2.5-flash',                     // alias fallback
]

const PROMPT = `
You are an expert Japanese receipt (レシート/領収書) parser.
Analyze the image and extract ALL of the following:

1. storeName: Store name (string)
2. totalAmount: Final total amount paid as a plain number. Look for 合計, 税込合計, お会計, TOTAL. NOT subtotal/tax alone.
3. date: Date in YYYY-MM-DD. Use current year if not shown.
4. category: ONE of: 'food', 'transport', 'utilities', 'entertainment', 'shopping', 'health', 'other'
5. items: Array of EVERY line item on the receipt. For each item extract:
   - name: Item name in original Japanese (string)
   - quantity: Quantity as number (default 1 if not shown)
   - unitPrice: Unit price as number (no symbols)
   - subtotal: Line subtotal as number (quantity × unitPrice)

Rules:
- Extract ALL items visible, not just 3
- If quantity column is missing, assume 1
- If unitPrice cannot be determined, set it equal to subtotal
- Always return valid JSON with no null values for required fields
- items array can be empty [] if receipt shows no line items

Return ONLY this JSON (no markdown, no backticks):
{
  "storeName": "string",
  "totalAmount": number,
  "date": "YYYY-MM-DD",
  "category": "string",
  "items": [
    {"name": "string", "quantity": number, "unitPrice": number, "subtotal": number}
  ]
}
`

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType } = await req.json()

    if (!image || !mimeType) {
      return NextResponse.json({ error: 'Missing image or mimeType' }, { status: 400 })
    }

    const ai = getAiClient()

    let lastError: Error | null = null

    for (const model of MODELS) {
      // Retry up to 3 times for temporary server errors (503)
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              PROMPT,
              { inlineData: { data: image, mimeType } },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          })

          const text = response.candidates?.[0]?.content?.parts?.[0]?.text
          if (!text) throw new Error('Empty response from AI')

          const data = JSON.parse(text)
          if (!data.totalAmount || !data.storeName) {
            throw new Error('AI could not extract receipt data. Please try a clearer photo.')
          }

          return NextResponse.json(data)
        } catch (err: any) {
          lastError = err
          const msg = String(err?.message ?? '')
          const isQuotaError = err?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
          const isNotFound = err?.status === 404 || msg.includes('404') || msg.includes('NOT_FOUND')
          const isUnavailable = err?.status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')

          if (isUnavailable && attempt < 3) {
            // Temporary overload — wait and retry same model (exponential backoff)
            const delay = attempt * 2000 // 2s, 4s
            console.warn(`[scan-receipt] Model ${model} unavailable (attempt ${attempt}/3), retrying in ${delay}ms...`)
            await new Promise(r => setTimeout(r, delay))
            continue
          }
          if (isQuotaError || isUnavailable) {
            // All retries exhausted or quota — try next model
            console.warn(`[scan-receipt] Model ${model} failed after ${attempt} attempts, trying next model...`)
            break // break inner retry loop, continue outer model loop
          }
          if (isNotFound) {
            console.warn(`[scan-receipt] Model ${model} not found, trying next...`)
            break
          }
          // Any other error — throw immediately
          throw err
        }
      }
    }

    // All models failed with quota
    throw new Error('QUOTA_EXCEEDED')

  } catch (error: any) {
    console.error('Scan Receipt Error:', error)

    if (error.message === 'MISSING_API_KEY') {
      return NextResponse.json({
        error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng xem hướng dẫn bên dưới.',
        code: 'MISSING_API_KEY'
      }, { status: 401 })
    }

    if (error.message === 'QUOTA_EXCEEDED') {
      return NextResponse.json({
        error: 'API Key của bạn đã hết hạn mức miễn phí hôm nay. Vui lòng thử lại sau vài phút hoặc kiểm tra hạn mức tại ai.dev/rate-limit.',
        code: 'QUOTA_EXCEEDED'
      }, { status: 429 })
    }

    return NextResponse.json({
      error: error.message || 'Lỗi không xác định',
      code: 'UNKNOWN'
    }, { status: 500 })
  }
}

