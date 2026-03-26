import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a precise nutrition analyst AI. Your job is to estimate the nutritional content of food described in text or shown in photos.

Return ONLY valid JSON with no extra text, markdown, or code blocks. Use this exact schema:
{
  "meal_name": "string (short 2-5 word name for the whole meal, e.g. 'Chicken Rice Bowl', 'Avocado Toast', 'Post-Workout Shake')",
  "items": [
    {
      "name": "string",
      "serving_description": "string (e.g. '1 cup', '2 slices', 'approx 200g')",
      "quantity": number,
      "calories": integer,
      "protein_g": number (one decimal place),
      "carbs_g": number (one decimal place),
      "fat_g": number (one decimal place),
      "fiber_g": number or null,
      "sugar_g": number or null
    }
  ],
  "confidence": number between 0 and 1,
  "confidence_notes": "string explaining uncertainty if confidence < 0.75, or null",
  "total_calories": integer,
  "total_protein_g": number,
  "total_carbs_g": number,
  "total_fat_g": number
}

Rules:
- Use USDA nutrition database values as reference when possible
- For restaurant food, use standard portion estimates
- If portion size is unclear, estimate a typical single serving and note it
- Be honest: if you can't see portion size in a photo, say so in confidence_notes
- Do not over-estimate to avoid health risks; be conservative on calorie counts
- Break multi-component dishes into separate items when possible
- Confidence 0.9+ = you can clearly identify everything. 0.7-0.9 = reasonable guess. Below 0.7 = significant uncertainty
- meal_name should be a clean, short display name (not a sentence)
- IMPORTANT: All string values must not contain literal newlines or control characters`

// Balanced JSON extractor — tracks depth + string boundaries correctly.
// Safer than greedy regex /\{[\s\S]*\}/ which breaks if AI adds trailing text.
function extractOutermostJSON(text: string): string | null {
  let start = -1
  let depth = 0
  let inString = false
  let escape = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{') {
      if (start === -1) start = i
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0 && start !== -1) return text.slice(start, i + 1)
    }
  }
  return null
}

// Replace literal control characters (unescaped newlines etc.) which are
// technically invalid inside JSON strings — a common AI output artifact.
function sanitizeJSON(s: string): string {
  return s.replace(/[\u0000-\u001f\u007f]/g, (c) => {
    if (c === '\n') return '\\n'
    if (c === '\r') return '\\r'
    if (c === '\t') return '\\t'
    return ' '
  })
}

function parseAIJson(rawText: string): unknown {
  const extracted = extractOutermostJSON(rawText)
  if (!extracted) throw new Error('No JSON object found in AI response')
  try {
    return JSON.parse(extracted)
  } catch {
    // Retry after sanitizing control chars in strings
    return JSON.parse(sanitizeJSON(extracted))
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, imageBase64, imageMimeType, refinementNote, hint } = body as {
      text?: string
      imageBase64?: string
      imageMimeType?: string
      refinementNote?: string  // post-analysis correction ("it was a 3x3")
      hint?: string            // pre-analysis user context added before photo analysis
    }

    if (!text && !imageBase64) {
      return NextResponse.json({ error: 'Provide text or image' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    type AllowedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    const allowedMimes: AllowedMime[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const safeMime: AllowedMime = allowedMimes.includes(imageMimeType as AllowedMime)
      ? (imageMimeType as AllowedMime)
      : 'image/jpeg'

    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: AllowedMime; data: string } }

    const content: ContentBlock[] = []

    if (imageBase64) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: safeMime, data: imageBase64 },
      })
    }

    let userText: string
    if (refinementNote) {
      // Post-analysis correction loop
      userText = imageBase64
        ? `Re-analyze this food photo with the following correction from the user: "${refinementNote}". Update the nutritional estimates to reflect this detail.`
        : `Re-analyze this food with the following correction: "${refinementNote}". Original: ${text ?? '(photo)'}. Update the estimates.`
    } else if (imageBase64 && (hint || text)) {
      // Photo + pre-analysis hint — user gave context before analyzing
      userText = `Please estimate the nutritional content of the food shown in this photo. User context: "${hint || text}"`
    } else if (text) {
      userText = `Please estimate the nutritional content of: ${text}`
    } else {
      userText = 'Please estimate the nutritional content of the food shown in this photo.'
    }

    content.push({ type: 'text', text: userText })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const parsed = parseAIJson(rawText)

    return NextResponse.json({ result: parsed, rawOutput: rawText })
  } catch (err) {
    console.error('[analyze-meal]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
