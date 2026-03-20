// Food search proxy using Open Food Facts — free, no API key, large catalog
// including branded/packaged foods. Handles CORS and normalizes the response
// into the shape LogMealClient expects for autofill.
import { NextRequest, NextResponse } from 'next/server'

interface OFFProduct {
  product_name?: string
  serving_size?: string
  nutriments?: {
    'energy-kcal_serving'?: number
    'energy-kcal_100g'?: number
    proteins_serving?: number
    proteins_100g?: number
    carbohydrates_serving?: number
    carbohydrates_100g?: number
    fat_serving?: number
    fat_100g?: number
  }
}

export interface FoodSuggestion {
  name: string
  serving_description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
    url.searchParams.set('search_terms', query)
    url.searchParams.set('json', 'true')
    url.searchParams.set('page_size', '12')
    url.searchParams.set('fields', 'product_name,serving_size,nutriments')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'BiteApp/1.0 (nutrition tracking)' },
      // Cache for 10 minutes — same query shouldn't hammer the API
      next: { revalidate: 600 },
    })

    if (!res.ok) return NextResponse.json({ results: [] })

    const data = await res.json() as { products?: OFFProduct[] }
    const products = data.products ?? []

    const results: FoodSuggestion[] = products
      .filter((p) => p.product_name && p.nutriments)
      .map((p) => {
        const n = p.nutriments!
        // Prefer per-serving values; fall back to per-100g
        const hasSrv = n['energy-kcal_serving'] != null
        const cal  = hasSrv ? (n['energy-kcal_serving'] ?? 0)    : (n['energy-kcal_100g'] ?? 0)
        const prot = hasSrv ? (n.proteins_serving ?? 0)           : (n.proteins_100g ?? 0)
        const carb = hasSrv ? (n.carbohydrates_serving ?? 0)      : (n.carbohydrates_100g ?? 0)
        const fat  = hasSrv ? (n.fat_serving ?? 0)                : (n.fat_100g ?? 0)
        const serving = p.serving_size ?? (hasSrv ? '1 serving' : '100g')
        return {
          name: p.product_name!,
          serving_description: serving,
          calories: Math.round(cal),
          protein_g: Math.round(prot * 10) / 10,
          carbs_g: Math.round(carb * 10) / 10,
          fat_g: Math.round(fat * 10) / 10,
        }
      })
      // Filter out entries with 0 calories (usually bad data)
      .filter((r) => r.calories > 0)
      .slice(0, 8)

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
