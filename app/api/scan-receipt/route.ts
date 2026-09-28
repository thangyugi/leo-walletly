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

const PAYMENT_METHODS = ['cash', 'credit_card', 'paypay', 'rakuten_pay', 'd_barai', 'au_pay', 'merpay', 'ic_card', 'e_money', 'other', 'unknown'] as const

function buildPrompt(categories: { id: string; name: string }[]) {
  const list = categories.length
    ? categories.map((c) => `- ${c.id}: ${c.name}`).join('\n')
    : '(none — always use null)'
  return `
You are an expert Japanese receipt (レシート/領収書) parser.
Analyze the image and extract:

1. storeName: Store name (string)
2. totalAmount: Final total paid as a plain number (合計, 税込合計, お会計, TOTAL) — not a subtotal or the tax alone.
3. taxAmount: Consumption tax shown on the receipt (内消費税 / 消費税等 / 税), 0 if none.
4. date: Date in YYYY-MM-DD. Use the current year if not shown.
5. paymentMethod: How it was paid — ONE of: ${PAYMENT_METHODS.join(', ')}.
   現金 / お預り / お釣り → cash; クレジット / VISA / Master / JCB / AMEX → credit_card;
   PayPay → paypay; 楽天ペイ → rakuten_pay; d払い → d_barai; au PAY → au_pay; メルペイ → merpay;
   交通系 / Suica / PASMO / ICOCA → ic_card; iD / QUICPay / nanaco / WAON / 楽天Edy → e_money;
   unknown if the receipt does not say.
6. categoryId: the ONE category below that fits the whole receipt best, or null.
7. items: EVERY purchased line. For each:
   - name: item name as printed (Japanese)
   - quantity: number (1 if not shown)
   - unitPrice: unit price as number (= subtotal if unknown)
   - subtotal: the line amount actually charged, with any discount printed for that item
     (値引 / 割引 / %OFF right under it) already subtracted
   - categoryId: the category below that fits THIS item (food vs cosmetics vs medicine vs
     household goods …), or null if none fits

Do NOT return as items: 小計, 合計, 消費税/税 lines, お預り, お釣り, ポイント, payment lines.
A discount that applies to the whole receipt may be one item with a negative subtotal.

Categories (id: name):
${list}

Return ONLY this JSON (no markdown):
{
  "storeName": "string",
  "totalAmount": number,
  "taxAmount": number,
  "date": "YYYY-MM-DD",
  "paymentMethod": "string",
  "categoryId": "string or null",
  "items": [
    {"name": "string", "quantity": number, "unitPrice": number, "subtotal": number, "categoryId": "string or null"}
  ]
}
`
}

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType, categories: rawCats } = await req.json()
    // The ledger's own categories, so the model picks real ids per item.
    const categories: { id: string; name: string }[] = Array.isArray(rawCats)
      ? rawCats.filter((c: { id?: unknown; name?: unknown } | null) => typeof c?.id === 'string' && typeof c?.name === 'string').slice(0, 200)
      : []
    const known = new Set(categories.map((c) => c.id))

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
              buildPrompt(categories),
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

          // Keep only ids that exist in this ledger, and a known payment method.
          const catOrNull = (v: unknown) => (typeof v === 'string' && known.has(v) ? v : null)
          data.categoryId = catOrNull(data.categoryId)
          data.paymentMethod = PAYMENT_METHODS.includes(data.paymentMethod) ? data.paymentMethod : 'unknown'
          data.items = Array.isArray(data.items)
            ? data.items.map((it: Record<string, unknown>) => ({ ...it, categoryId: catOrNull(it?.categoryId) }))
            : []
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

