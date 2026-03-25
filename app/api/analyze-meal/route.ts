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
- Break multi-component dishes into separate items when possible (e.g., burger: bun + patty + toppings as one item is fine, but separate items for a full plate)
- Confidence 0.9+ = you can clearly identify everything. 0.7-0.9 = reasonable guess. Below 0.7 = significant uncertainty
- meal_name should be a clean, short display name (not a sentence)`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, imageBase64, imageMimeType, refinementNote } = body as {
      text?: string
      imageBase64?: string
      imageMimeType?: string
      refinementNote?: string  // optional correction hint (e.g. "it was a 3x3", "animal style")
    }

    if (!text && !imageBase64) {
      return NextResponse.json({ error: 'Provide text or image' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Build message content
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
        source: {
          type: 'base64',
          media_type: safeMime,
          data: imageBase64,
        },
      })
    }

    let userText: string
    if (refinementNote) {
      // Correction loop: user is refining a previous AI result
      userText = imageBase64
        ? `Re-analyze this food photo with the following correction from the user: "${refinementNote}". Update the nutritional estimates to reflect this detail.`
        : `Re-analyze this food with the following correction: "${refinementNote}". Original description: ${text ?? '(photo)'}. Update the estimates to reflect this detail.`
    } else {
      userText = text
        ? `Please estimate the nutritional content of: ${text}`
        : 'Please estimate the nutritional content of the food shown in this photo.'
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

    // Extract JSON from response (handle any extra whitespace)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      result: parsed,
      rawOutput: rawText,
    })
  } catch (err) {
    console.error('[analyze-meal]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
