// Barcode product lookup — uses Open Food Facts as primary source.
// No API key required. Supports UPC-A, UPC-E, EAN-8, EAN-13.
// A future paid provider (Nutritionix, Edamam) can replace/augment this
// by swapping the provider function below.
import { NextRequest, NextResponse } from 'next/server'

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
}

interface OFFNutriments {
  'energy-kcal_serving'?: number
  'energy-kcal_100g'?: number
  proteins_serving?: number
  proteins_100g?: number
  carbohydrates_serving?: number
  carbohydrates_100g?: number
  fat_serving?: number
  fat_100g?: number
  fiber_serving?: number
  fiber_100g?: number
  sugars_serving?: number
  sugars_100g?: number
  sodium_serving?: number
  sodium_100g?: number
}

interface OFFResponse {
  status: number  // 1 = found, 0 = not found
  product?: {
    product_name?: string
    brands?: string
    serving_size?: string
    nutriments?: OFFNutriments
  }
}

async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BiteApp/1.0 (nutrition tracking)' },
    next: { revalidate: 86400 }, // cache 24h — product data rarely changes
  })
  if (!res.ok) return null

  const data = await res.json() as OFFResponse
  if (data.status !== 1 || !data.product) return null

  const p = data.product
  const n = p.nutriments ?? {}

  const hasSrv = n['energy-kcal_serving'] != null
  const cal    = hasSrv ? (n['energy-kcal_serving'] ?? 0)    : (n['energy-kcal_100g'] ?? 0)
  const prot   = hasSrv ? (n.proteins_serving ?? 0)           : (n.proteins_100g ?? 0)
  const carb   = hasSrv ? (n.carbohydrates_serving ?? 0)      : (n.carbohydrates_100g ?? 0)
  const fat    = hasSrv ? (n.fat_serving ?? 0)                : (n.fat_100g ?? 0)
  const fiber  = hasSrv ? (n.fiber_serving ?? null)           : (n.fiber_100g ?? null)
  const sugar  = hasSrv ? (n.sugars_serving ?? null)          : (n.sugars_100g ?? null)
  const sodium = hasSrv ? (n.sodium_serving ?? null)          : (n.sodium_100g ?? null)

  const name = p.product_name?.trim()
  if (!name || cal === 0) return null  // Skip junk data entries

  return {
    barcode,
    name,
    brand: p.brands?.split(',')[0].trim() || null,
    serving_description: p.serving_size ?? (hasSrv ? '1 serving' : '100g'),
    calories: Math.round(cal),
    protein_g: Math.round(prot * 10) / 10,
    carbs_g: Math.round(carb * 10) / 10,
    fat_g: Math.round(fat * 10) / 10,
    fiber_g: fiber != null ? Math.round(fiber * 10) / 10 : null,
    sugar_g: sugar != null ? Math.round(sugar * 10) / 10 : null,
    sodium_mg: sodium != null ? Math.round(sodium * 1000) : null, // OFF stores sodium in g
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) {
    return NextResponse.json({ error: 'Missing barcode' }, { status: 400 })
  }

  // Sanitize — barcodes are digits only
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
