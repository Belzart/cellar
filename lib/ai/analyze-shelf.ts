import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ShelfExtractionResult } from '@/lib/types'
import { SHELF_EXTRACTION_SYSTEM, SHELF_EXTRACTION_USER } from './prompts'

function getAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    const match = envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    if (match) return match[1].trim()
  } catch { /* ignore */ }
  throw new Error('ANTHROPIC_API_KEY not found in environment or .env.local')
}

// ── Main shelf analysis function ──────────────────────────
export async function analyzeShelfPhoto(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<{ raw: unknown; parsed: ShelfExtractionResult }> {
  const client = new Anthropic({ apiKey: getAnthropicKey() })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SHELF_EXTRACTION_SYSTEM,
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
            text: SHELF_EXTRACTION_USER,
          },
        ],
      },
    ],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = parseShelfResponse(rawText)

  return { raw: response, parsed }
}

// ── Parse + validate shelf response ──────────────────────
function parseShelfResponse(rawText: string): ShelfExtractionResult {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  const fallback: ShelfExtractionResult = {
    candidates: [],
    image_quality: 'poor',
    confidence_notes: 'Failed to parse model response',
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(cleaned)
  } catch {
    return fallback
  }

  const candidates = Array.isArray(data.candidates)
    ? data.candidates
        .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
        .map((c) => ({
          candidate_name_raw: typeof c.candidate_name_raw === 'string'
            ? c.candidate_name_raw : '',
          candidate_producer_raw: typeof c.candidate_producer_raw === 'string'
            ? c.candidate_producer_raw : undefined,
          candidate_vintage_raw:
            typeof c.candidate_vintage_raw === 'number' &&
            c.candidate_vintage_raw > 1800 &&
            c.candidate_vintage_raw < 2100
              ? c.candidate_vintage_raw : undefined,
          candidate_varietal_raw: typeof c.candidate_varietal_raw === 'string'
            ? c.candidate_varietal_raw : undefined,
          candidate_region_raw: typeof c.candidate_region_raw === 'string'
            ? c.candidate_region_raw : undefined,
        }))
        .filter((c) => c.candidate_name_raw || c.candidate_producer_raw)
        .slice(0, 20) // enforce cap
    : []

  const image_quality = ['good', 'fair', 'poor'].includes(data.image_quality as string)
    ? (data.image_quality as 'good' | 'fair' | 'poor')
    : 'fair'

  return {
    candidates,
    image_quality,
    confidence_notes: typeof data.confidence_notes === 'string'
      ? data.confidence_notes : '',
  }
}
