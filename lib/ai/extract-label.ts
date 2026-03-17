import Anthropic from '@anthropic-ai/sdk'
import { ExtractedWineData, WineStyle } from '@/lib/types'
import {
  LABEL_EXTRACTION_SYSTEM,
  LABEL_EXTRACTION_USER,
} from './prompts'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const VALID_STYLES: WineStyle[] = [
  'red', 'white', 'rosé', 'sparkling', 'dessert', 'fortified', 'orange', 'other',
]

// ── Main extraction function ──────────────────────────────
// Accepts a base64-encoded image and returns structured wine data.
// Always returns something — falls back to low-confidence result on error.
export async function extractWineLabel(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<{ raw: unknown; parsed: ExtractedWineData }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: LABEL_EXTRACTION_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: LABEL_EXTRACTION_USER,
          },
        ],
      },
    ],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  // Parse and validate the JSON response
  const parsed = parseExtractionResponse(rawText)

  return { raw: response, parsed }
}

// ── Parse + validate the model's JSON output ─────────────
function parseExtractionResponse(rawText: string): ExtractedWineData {
  // Strip any markdown code blocks if present
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  let data: Record<string, unknown>
  try {
    data = JSON.parse(cleaned)
  } catch {
    // Model returned non-JSON — return a graceful fallback
    return {
      confidence: 0.1,
      confidence_notes: 'Failed to parse model response',
    }
  }

  const parsed: ExtractedWineData = {
    confidence: typeof data.confidence === 'number'
      ? Math.max(0, Math.min(1, data.confidence))
      : 0.5,
  }

  if (typeof data.producer === 'string' && data.producer) parsed.producer = data.producer
  if (typeof data.wine_name === 'string' && data.wine_name) parsed.wine_name = data.wine_name
  if (typeof data.vintage === 'number' && data.vintage > 1800 && data.vintage < 2100) {
    parsed.vintage = data.vintage
  }
  if (typeof data.region === 'string' && data.region) parsed.region = data.region
  if (typeof data.country === 'string' && data.country) parsed.country = data.country
  if (typeof data.appellation === 'string' && data.appellation) parsed.appellation = data.appellation
  if (typeof data.varietal === 'string' && data.varietal) parsed.varietal = data.varietal
  if (typeof data.confidence_notes === 'string') parsed.confidence_notes = data.confidence_notes
  if (typeof data.canonical_name_suggestion === 'string') {
    parsed.canonical_name_suggestion = data.canonical_name_suggestion
  }

  // Validate style
  if (typeof data.style === 'string' && VALID_STYLES.includes(data.style as WineStyle)) {
    parsed.style = data.style as WineStyle
  }

  // Parse blend_components
  if (Array.isArray(data.blend_components)) {
    parsed.blend_components = data.blend_components
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .map((c) => ({
        varietal: typeof c.varietal === 'string' ? c.varietal : '',
        ...(typeof c.percentage === 'number' ? { percentage: c.percentage } : {}),
      }))
      .filter((c) => c.varietal)
  }

  return parsed
}

// ── Build canonical name from extracted data ──────────────
export function buildCanonicalName(data: ExtractedWineData): string {
  if (data.canonical_name_suggestion) return data.canonical_name_suggestion

  const parts: string[] = []
  if (data.producer) parts.push(data.producer)
  if (data.wine_name) parts.push(data.wine_name)
  if (data.vintage) parts.push(String(data.vintage))

  return parts.join(' ').trim() || 'Unknown Wine'
}
