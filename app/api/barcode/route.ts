// Barcode product lookup — uses Open Food Facts as primary source.
// No API key required. Supports UPC-A, UPC-E, EAN-8, EAN-13.
//
// Data quality notes on Open Food Facts:
// - Products have EITHER per-serving OR per-100g nutriment fields (sometimes both, sometimes mixed)
// - The old single `hasSrv` flag caused cross-unit bugs: calories from serving × protein from 100g = wrong
// - Fix: each nutrient independently prefers _serving if defined & >0, else falls back to _100g
// - We also score data quality so the client can warn the user when data is uncertain
import { NextRequest, NextResponse } from 'next/server'

export type BarcodeDataQuality =
  | 'ok'                // per-serving data, all key macros present
  | 'serving_estimated' // per-serving calories but some macros missing — fell back to 100g
  | 'per_100g_only'     // no serving size info, showing per-100g values

export interface BarcodeProduct {
  barcode: string
  name: string
  brand: string | null
  serving_description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  data_quality: BarcodeDataQuality
}

interface OFFNutriments {
  // Per-serving fields
  'energy-kcal_serving'?: number
  proteins_serving?: number
  carbohydrates_serving?: number
  fat_serving?: number
  fiber_serving?: number
  sugars_serving?: number
  sodium_serving?: number
  // Per-100g fields (always present in well-populated products)
  'energy-kcal_100g'?: number
  proteins_100g?: number
  carbohydrates_100g?: number
  fat_100g?: number
  fiber_100g?: number
  sugars_100g?: number
  sodium_100g?: number
}

interface OFFResponse {
  status: number
  product?: {
    product_name?: string
    brands?: string
    serving_size?: string
    nutriments?: OFFNutriments
  }
}

// Per-field fallback: prefer _serving if non-null & defined, else _100g.
// This prevents the cross-unit bug where calories come from serving but protein from 100g.
function pickNutrient(
  serving: number | undefined,
  per100: number | undefined
): { value: number; source: 'serving' | '100g' | 'missing' } {
  if (serving != null && serving > 0) return { value: serving, source: 'serving' }
  if (per100 != null && per100 > 0) return { value: per100, source: '100g' }
  return { value: 0, source: 'missing' }
}

async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BiteApp/1.0 (nutrition tracking; contact: bite@app)' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null

  const data = await res.json() as OFFResponse
  if (data.status !== 1 || !data.product) return null

  const p = data.product
  const n = p.nutriments ?? {}

  // Each nutrient picks its own source independently
  const cal  = pickNutrient(n['energy-kcal_serving'], n['energy-kcal_100g'])
  const prot = pickNutrient(n.proteins_serving, n.proteins_100g)
  const carb = pickNutrient(n.carbohydrates_serving, n.carbohydrates_100g)
  const fat  = pickNutrient(n.fat_serving, n.fat_100g)
  const fib  = pickNutrient(n.fiber_serving, n.fiber_100g)
  const sug  = pickNutrient(n.sugars_serving, n.sugars_100g)
  const sod  = pickNutrient(n.sodium_serving, n.sodium_100g)

  const name = p.product_name?.trim()
  if (!name || cal.value === 0) return null

  // Determine data quality
  const sources = [cal.source, prot.source, carb.source, fat.source]
  const allServing = sources.every(s => s === 'serving')
  const someServing = sources.some(s => s === 'serving')
  const someMissing = sources.some(s => s === 'missing')

  let data_quality: BarcodeDataQuality
  if (allServing && !someMissing && p.serving_size) {
    data_quality = 'ok'
  } else if (someServing && (someMissing || !allServing)) {
    data_quality = 'serving_estimated'  // mixed — some fields from different bases
  } else {
    data_quality = 'per_100g_only'
  }

  const serving_description = p.serving_size?.trim()
    || (data_quality === 'per_100g_only' ? '100g' : '1 serving')

  return {
    barcode,
    name,
    brand: p.brands?.split(',')[0].trim() || null,
    serving_description,
    calories: Math.round(cal.value),
    protein_g: Math.round(prot.value * 10) / 10,
    carbs_g: Math.round(carb.value * 10) / 10,
    fat_g: Math.round(fat.value * 10) / 10,
    fiber_g: fib.source !== 'missing' ? Math.round(fib.value * 10) / 10 : null,
    sugar_g: sug.source !== 'missing' ? Math.round(sug.value * 10) / 10 : null,
    // OFF sodium is in grams; convert to mg
    sodium_mg: sod.source !== 'missing' ? Math.round(sod.value * 1000) : null,
    data_quality,
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) {
    return NextResponse.json({ error: 'Missing barcode' }, { status: 400 })
  }

  const sanitized = code.replace(/\D/g, '')
  if (sanitized.length < 8 || sanitized.length > 14) {
    return NextResponse.json({ error: 'Invalid barcode format' }, { status: 400 })
  }

  try {
    const product = await lookupOpenFoodFacts(sanitized)
    if (!product) {
      return NextResponse.json({ found: false, product: null })
    }
    return NextResponse.json({ found: true, product })
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
