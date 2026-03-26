'use client'

import { useState, useRef, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  ChevronLeft, Type, Camera, AlertCircle, CheckCircle2,
  Edit3, BookmarkPlus, X, Plus, Search, Barcode, PackageSearch
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  MealType, MEAL_TYPES, MEAL_TYPE_LABELS, MEAL_TYPE_EMOJI,
  MealAnalysisResult, MealAnalysisItem
} from '@/lib/types/nutrition'
import { saveMealEntry, saveFoodToLibrary } from '@/lib/actions/nutrition'
import type { FoodSuggestion } from '@/app/api/food-search/route'
import type { BarcodeProduct } from '@/app/api/barcode/route'

// Dynamic import — BarcodeScanner uses camera APIs, must not SSR
const BarcodeScanner = dynamic(() => import('@/components/bite/BarcodeScanner'), { ssr: false })

type Mode = 'choose' | 'text' | 'photo' | 'result' | 'manual' | 'barcode'

// ── Barcode localStorage cache ────────────────────────────────
const BARCODE_CACHE_KEY = 'bite_barcode_cache'

function loadBarcodeCache(): Record<string, BarcodeProduct> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(BARCODE_CACHE_KEY) ?? '{}') } catch { return {} }
}
function saveBarcodeCache(code: string, product: BarcodeProduct) {
  try {
    const cache = loadBarcodeCache()
    cache[code] = product
    localStorage.setItem(BARCODE_CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

interface LogMealClientProps {
  initialMealType?: string
}

const isMealType = (v: string | undefined): v is MealType =>
  !!v && MEAL_TYPES.includes(v as MealType)

// ── Debounce hook ─────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function LogMealClient({ initialMealType }: LogMealClientProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choose')
  const [mealType, setMealType] = useState<MealType>(
    isMealType(initialMealType) ? initialMealType : 'snack'
  )
  const [textInput, setTextInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [photoHint, setPhotoHint] = useState('')  // optional user context sent with photo
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null)
  const [editedItems, setEditedItems] = useState<MealAnalysisItem[]>([])
  const [mealName, setMealName] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [, startNavTransition] = useTransition()
  const [savedToLibrary, setSavedToLibrary] = useState<Set<number>>(new Set())

  // "Add More" state
  const [showAddMore, setShowAddMore] = useState(false)
  const [addMoreText, setAddMoreText] = useState('')
  const [addMoreAnalyzing, setAddMoreAnalyzing] = useState(false)

  // Photo refinement state (AI correction loop)
  const [imageBase64ForRefine, setImageBase64ForRefine] = useState<string | null>(null)
  const [imageMimeForRefine, setImageMimeForRefine] = useState<string>('image/jpeg')
  const [showRefine, setShowRefine] = useState(false)
  const [refineNote, setRefineNote] = useState('')
  const [refining, setRefining] = useState(false)
  // Track what source produced the current result (for showing refine vs add-more)
  const [resultSource, setResultSource] = useState<'text' | 'photo' | 'barcode' | null>(null)

  // Barcode state
  const [barcodeScanning, setBarcodeScanning] = useState(false)
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeNotFound, setBarcodeNotFound] = useState(false)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [barcodeDataQuality, setBarcodeDataQuality] = useState<import('@/app/api/barcode/route').BarcodeDataQuality | null>(null)

  // Manual entry state
  const [manualName, setManualName] = useState('')
  const [manualServing, setManualServing] = useState('')
  const [manualCals, setManualCals] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')
  const [manualFat, setManualFat] = useState('')

  // Food autocomplete state (manual mode)
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const debouncedName = useDebounce(manualName, 350)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Food autocomplete ─────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`)
      const data = await res.json() as { results: FoodSuggestion[] }
      setSuggestions(data.results ?? [])
      setShowSuggestions(data.results.length > 0)
    } catch { setSuggestions([]) } finally { setSearchLoading(false) }
  }, [])

  useEffect(() => {
    if (mode === 'manual') fetchSuggestions(debouncedName)
  }, [debouncedName, mode, fetchSuggestions])

  function selectSuggestion(s: FoodSuggestion) {
    setManualName(s.name)
    setManualServing(s.serving_description)
    setManualCals(String(s.calories))
    setManualProtein(String(s.protein_g))
    setManualCarbs(String(s.carbs_g))
    setManualFat(String(s.fat_g))
    setShowSuggestions(false)
    setSuggestions([])
  }

  // ── Live totals ───────────────────────────────────────────────
  const liveTotals = {
    calories:  editedItems.reduce((s, i) => s + Math.round(Number(i.calories)), 0),
    protein_g: editedItems.reduce((s, i) => s + Number(i.protein_g), 0),
    carbs_g:   editedItems.reduce((s, i) => s + Number(i.carbs_g), 0),
    fat_g:     editedItems.reduce((s, i) => s + Number(i.fat_g), 0),
  }

  // ── Barcode scan handler ──────────────────────────────────────
  const handleBarcodeScan = useCallback(async (code: string) => {
    setBarcodeScanning(false)
    setBarcodeLoading(true)
    setBarcodeNotFound(false)
    setError(null)
    setLastScannedCode(code)

    // Check localStorage cache first for instant result
    const cached = loadBarcodeCache()[code]
    if (cached) {
      populateFromBarcode(cached)
      setBarcodeLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`)
      const data = await res.json() as { found: boolean; product: BarcodeProduct | null; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Lookup failed')
      if (!data.found || !data.product) {
        setBarcodeNotFound(true)
        setBarcodeLoading(false)
        setMode('barcode') // stay on barcode not-found screen
        return
      }
      saveBarcodeCache(code, data.product)
      populateFromBarcode(data.product)
    } catch {
      setError('Product lookup failed — enter details manually')
      setMode('barcode')
    } finally {
      setBarcodeLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function populateFromBarcode(product: BarcodeProduct) {
    const name = product.brand ? `${product.brand} ${product.name}` : product.name
    const syntheticResult: MealAnalysisResult = {
      meal_name: name,
      items: [{
        name,
        serving_description: product.serving_description,
        quantity: 1,
        calories: product.calories,
        protein_g: product.protein_g,
        carbs_g: product.carbs_g,
        fat_g: product.fat_g,
        fiber_g: product.fiber_g,
        sugar_g: product.sugar_g,
      }],
      confidence: 1,
      total_calories: product.calories,
      total_protein_g: product.protein_g,
      total_carbs_g: product.carbs_g,
      total_fat_g: product.fat_g,
    }
    setAnalysisResult(syntheticResult)
    setEditedItems(syntheticResult.items)
    setMealName(name)
    setBarcodeDataQuality(product.data_quality ?? null)
    setResultSource('barcode')
    setMode('result')
  }

  function goBack() {
    setMode('choose')
    setError(null)
    setShowAddMore(false)
    setShowRefine(false)
    setRefineNote('')
    setBarcodeNotFound(false)
    setLastScannedCode(null)
    setBarcodeScanning(false)
    setImageBase64ForRefine(null)
    setResultSource(null)
  }

  // ── AI Photo refinement (correction loop) ─────────────────────
  async function runRefinement() {
    if (!refineNote.trim()) return
    setRefining(true); setError(null)
    try {
      const body = imageBase64ForRefine
        ? { imageBase64: imageBase64ForRefine, imageMimeType: imageMimeForRefine, refinementNote: refineNote }
        : { text: textInput, refinementNote: refineNote }
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Refinement failed')
      setAnalysisResult(data.result)
      setEditedItems(data.result.items)
      setMealName(data.result.meal_name ?? mealName)
      setShowRefine(false)
      setRefineNote('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refinement failed')
    } finally { setRefining(false) }
  }

  // ── AI Analysis ───────────────────────────────────────────────
  async function runTextAnalysis() {
    if (!textInput.trim()) return
    setAnalyzing(true); setError(null)
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setAnalysisResult(data.result)
      setEditedItems(data.result.items)
      setMealName(data.result.meal_name ?? '')
      setResultSource('text')
      setMode('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally { setAnalyzing(false) }
  }

  async function runPhotoAnalysis() {
    if (!imageFile) return
    setAnalyzing(true); setError(null)
    try {
      const base64 = await fileToBase64(imageFile)
      const mime = imageFile.type
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, imageMimeType: mime, hint: photoHint.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      // Store base64 so the refinement loop can re-submit the same image
      setImageBase64ForRefine(base64)
      setImageMimeForRefine(mime)
      setAnalysisResult(data.result)
      setEditedItems(data.result.items)
      setMealName(data.result.meal_name ?? '')
      setResultSource('photo')
      setMode('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally { setAnalyzing(false) }
  }

  async function runAddMoreAnalysis() {
    if (!addMoreText.trim()) return
    setAddMoreAnalyzing(true); setError(null)
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: addMoreText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setEditedItems((prev) => [...prev, ...(data.result.items ?? [])])
      setAddMoreText(''); setShowAddMore(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally { setAddMoreAnalyzing(false) }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // ── Item editing ──────────────────────────────────────────────
  function updateItem(idx: number, field: keyof MealAnalysisItem, value: string | number) {
    setEditedItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, [field]: typeof value === 'string' ? value : Number(value) } : item
    ))
  }

  function removeItem(idx: number) {
    setEditedItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Save ──────────────────────────────────────────────────────
  async function handleSaveAll() {
    if (editedItems.length === 0) return
    setSaving(true); setError(null)
    const breakdown = editedItems.length > 1
      ? JSON.stringify({ _type: 'breakdown', items: editedItems }) : undefined
    const entryName = mealName.trim() || editedItems[0]?.name || 'Meal'
    const servingDesc = editedItems.length > 1
      ? `${editedItems.length} items` : editedItems[0]?.serving_description

    // If this was a barcode scan, persist the user's (possibly corrected) values
    // back to the local barcode cache so next scan uses their version.
    if (lastScannedCode && editedItems.length === 1) {
      const item = editedItems[0]
      const override: BarcodeProduct = {
        barcode: lastScannedCode,
        name: item.name,
        brand: null,
        serving_description: item.serving_description ?? servingDesc ?? '1 serving',
        calories: Math.round(Number(item.calories)),
        protein_g: Number(item.protein_g),
        carbs_g: Number(item.carbs_g),
        fat_g: Number(item.fat_g),
        fiber_g: item.fiber_g ?? null,
        sugar_g: item.sugar_g ?? null,
        sodium_mg: null,
        data_quality: 'ok', // user-verified
      }
      saveBarcodeCache(lastScannedCode, override)
    }

    const result = await saveMealEntry({
      meal_type: mealType,
      source: lastScannedCode ? 'barcode' : (textInput ? 'ai_text' : 'ai_photo'),
      raw_input: textInput || lastScannedCode || undefined,
      name: entryName,
      serving_description: servingDesc,
      calories: liveTotals.calories,
      protein_g: liveTotals.protein_g,
      carbs_g: liveTotals.carbs_g,
      fat_g: liveTotals.fat_g,
      notes: breakdown,
    })
    if (result.error) { setError(result.error); setSaving(false); return }
    startNavTransition(() => router.push('/bite'))
  }

  async function handleSaveManual() {
    if (!manualName || !manualCals) return
    setSaving(true); setError(null)
    const result = await saveMealEntry({
      meal_type: mealType,
      source: 'manual',
      name: manualName,
      serving_description: manualServing || undefined,
      calories: parseInt(manualCals) || 0,
      protein_g: parseFloat(manualProtein) || 0,
      carbs_g: parseFloat(manualCarbs) || 0,
      fat_g: parseFloat(manualFat) || 0,
    })
    if (result.error) { setError(result.error); setSaving(false); return }
    startNavTransition(() => router.push('/bite'))
  }

  async function handleSaveToLibrary(idx: number) {
    const item = editedItems[idx]
    try {
      await saveFoodToLibrary({
        name: item.name,
        serving_description: item.serving_description,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g ?? null,
        sugar_g: item.sugar_g ?? null,
        sodium_mg: null,
      })
      setSavedToLibrary((prev) => new Set([...prev, idx]))
    } catch {}
  }

  // ── Render ────────────────────────────────────────────────────

  // Full-screen scanner overlay — rendered on top of everything
  if (barcodeScanning) {
    return <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setBarcodeScanning(false)} />
  }

  // Loading state shown after scanner closes and lookup is in flight
  if (barcodeLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-14 h-14 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center shadow-bite-card">
          <PackageSearch className="w-7 h-7 text-bite animate-pulse" />
        </div>
        <p className="text-ink font-semibold">Looking up product…</p>
        <p className="text-ink-tertiary text-sm text-center">Searching food database</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4">
        {mode !== 'choose' ? (
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full bg-surface-card border border-surface-border flex items-center justify-center active:scale-95 transition-transform shadow-bite-card"
          >
            <ChevronLeft className="w-4 h-4 text-ink" />
          </button>
        ) : (
          <Link
            href="/bite"
            className="w-9 h-9 rounded-full bg-surface-card border border-surface-border flex items-center justify-center active:scale-95 transition-transform shadow-bite-card"
          >
            <ChevronLeft className="w-4 h-4 text-ink" />
          </Link>
        )}
        <h1 className="text-xl font-bold text-ink">
          {mode === 'choose' && 'Log a Meal'}
          {mode === 'text' && 'Describe Food'}
          {mode === 'photo' && 'Photo Analysis'}
          {mode === 'result' && 'Review & Edit'}
          {mode === 'manual' && 'Add Manually'}
          {mode === 'barcode' && 'Barcode Scan'}
        </h1>
      </header>

      <div className="px-4 pb-8 space-y-4">

        {/* Meal type selector */}
        {mode !== 'result' && (
          <div>
            <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Meal</p>
            <div className="flex gap-2 flex-wrap">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setMealType(type)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-100 active:scale-95',
                    mealType === type
                      ? 'bg-ink text-surface-card border-ink'
                      : 'bg-surface-card text-ink-secondary border-surface-border'
                  )}
                >
                  <span>{MEAL_TYPE_EMOJI[type]}</span>
                  {MEAL_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Choose mode ── */}
        {mode === 'choose' && (
          <div className="space-y-3 pt-2">
            {/* Barcode scan — highlighted as first option */}
            <button
              onClick={() => { setMode('choose'); setBarcodeNotFound(false); setBarcodeScanning(true) }}
              className="w-full bg-surface-card border border-surface-border rounded-2xl p-5 text-left active:scale-[0.98] transition-transform shadow-bite-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
                  <Barcode className="w-6 h-6 text-[#059669]" />
                </div>
                <div>
                  <p className="text-ink font-semibold">Scan barcode</p>
                  <p className="text-ink-tertiary text-sm mt-0.5">Point at any food package</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('text')}
              className="w-full bg-surface-card border border-surface-border rounded-2xl p-5 text-left active:scale-[0.98] transition-transform shadow-bite-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-bite/10 flex items-center justify-center flex-shrink-0">
                  <Type className="w-6 h-6 text-bite" />
                </div>
                <div>
                  <p className="text-ink font-semibold">Type what you ate</p>
                  <p className="text-ink-tertiary text-sm mt-0.5">AI estimates calories & macros</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('photo')}
              className="w-full bg-surface-card border border-surface-border rounded-2xl p-5 text-left active:scale-[0.98] transition-transform shadow-bite-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                  <Camera className="w-6 h-6 text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-ink font-semibold">Photo analysis</p>
                  <p className="text-ink-tertiary text-sm mt-0.5">Take or upload a food photo</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('manual')}
              className="w-full bg-surface-card border border-surface-border rounded-2xl p-5 text-left active:scale-[0.98] transition-transform shadow-bite-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-elevated flex items-center justify-center flex-shrink-0">
                  <Edit3 className="w-6 h-6 text-ink-secondary" />
                </div>
                <div>
                  <p className="text-ink font-semibold">Enter manually</p>
                  <p className="text-ink-tertiary text-sm mt-0.5">Search food database or fill in yourself</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── Barcode not-found / error state ── */}
        {mode === 'barcode' && (
          <div className="space-y-4 pt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <PackageSearch className="w-7 h-7 text-amber-600" />
              </div>
              <p className="text-amber-800 font-semibold text-base">
                {barcodeNotFound ? 'Product not found' : 'Lookup failed'}
              </p>
              {lastScannedCode && (
                <p className="text-amber-600/70 text-xs mt-1 font-mono">
                  Code: {lastScannedCode}
                </p>
              )}
              <p className="text-amber-700 text-sm mt-2">
                {barcodeNotFound
                  ? 'This barcode isn\'t in the database yet.'
                  : 'Could not connect to food database.'}
              </p>
            </div>

            <button
              onClick={() => setBarcodeScanning(true)}
              className="w-full py-3 rounded-2xl bg-surface-card border border-surface-border text-ink font-semibold active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Barcode className="w-4 h-4" />
              Try scanning again
            </button>

            {/* Photo nutrition label fallback — send to photo mode */}
            <button
              onClick={() => {
                setBarcodeNotFound(false)
                setLastScannedCode(null)
                setMode('photo')
              }}
              className="w-full py-3 rounded-2xl bg-[#EFF6FF] border border-[#3B82F6]/20 text-[#3B82F6] font-semibold active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Photo the nutrition label instead
            </button>

            <button
              onClick={() => {
                setBarcodeNotFound(false)
                setLastScannedCode(null)
                setMode('manual')
              }}
              className="w-full py-3 rounded-2xl bg-ink text-surface-card font-semibold active:scale-95 transition-all"
            >
              Enter manually instead
            </button>
          </div>
        )}

        {/* ── Text input ── */}
        {mode === 'text' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">
                What did you eat?
              </p>
              <textarea
                className="w-full bg-surface-card border border-surface-border rounded-2xl p-4 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 focus:ring-1 focus:ring-bite/20 resize-none transition-colors text-base"
                rows={4}
                placeholder="e.g., grilled chicken breast with steamed broccoli and brown rice, about 1 cup of rice..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                autoFocus
              />
            </div>
            {error && <ErrorBanner message={error} />}
            <button
              onClick={runTextAnalysis}
              disabled={!textInput.trim() || analyzing}
              className={cn(
                'w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-95',
                analyzing || !textInput.trim()
                  ? 'bg-surface-elevated text-ink-tertiary'
                  : 'bg-bite text-white'
              )}
            >
              {analyzing ? 'Analyzing with AI…' : 'Analyze Food'}
            </button>
          </div>
        )}

        {/* ── Photo input ── */}
        {mode === 'photo' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageSelect}
            />
            {!imagePreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 bg-surface-card border-2 border-dashed border-surface-border rounded-2xl flex flex-col items-center justify-center gap-3 active:bg-surface-elevated transition-colors"
              >
                <Camera className="w-10 h-10 text-ink-tertiary" />
                <p className="text-ink-secondary text-sm font-medium">Tap to take or upload a photo</p>
              </button>
            ) : (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Food" className="w-full h-52 object-cover rounded-2xl" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="text-ink-tertiary text-sm underline"
                >
                  Choose different photo
                </button>
              </div>
            )}
            {/* Optional hint — improves AI accuracy for branded/specific foods */}
            <div>
              <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-1.5">
                Add details <span className="font-normal normal-case text-ink-tertiary">(optional)</span>
              </label>
              <textarea
                className="w-full bg-surface-card border border-surface-border rounded-xl p-3 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/40 resize-none"
                rows={2}
                placeholder="e.g., 3x3 burger, battered fish from Trader Joe's, two tacos, animal style…"
                value={photoHint}
                onChange={(e) => setPhotoHint(e.target.value)}
              />
            </div>

            {error && <ErrorBanner message={error} />}
            <button
              onClick={runPhotoAnalysis}
              disabled={!imageFile || analyzing}
              className={cn(
                'w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-95',
                !imageFile || analyzing
                  ? 'bg-surface-elevated text-ink-tertiary'
                  : 'bg-[#3B82F6] text-white'
              )}
            >
              {analyzing ? 'Analyzing photo…' : 'Analyze Photo'}
            </button>
          </div>
        )}

        {/* ── Results / edit ── */}
        {mode === 'result' && analysisResult && (
          <div className="space-y-4 animate-slide-up">
            {/* Meal type */}
            <div>
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Logging to</p>
              <div className="flex gap-2 flex-wrap">
                {MEAL_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setMealType(type)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-100 active:scale-95',
                      mealType === type
                        ? 'bg-ink text-surface-card border-ink'
                        : 'bg-surface-card text-ink-secondary border-surface-border'
                    )}
                  >
                    <span>{MEAL_TYPE_EMOJI[type]}</span>
                    {MEAL_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal name */}
            <div>
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Meal name</p>
              <input
                className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-ink font-semibold placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 focus:ring-1 focus:ring-bite/20 text-base"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="e.g., Chicken Rice Bowl"
              />
            </div>

            {/* Confidence badge — omit for barcode (confidence = 1, from DB) */}
            {!lastScannedCode && (
              <div className={cn(
                'flex items-start gap-2 rounded-xl p-3 border',
                analysisResult.confidence >= 0.75
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              )}>
                {analysisResult.confidence >= 0.75
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className={cn('text-sm font-medium', analysisResult.confidence >= 0.75 ? 'text-green-700' : 'text-amber-700')}>
                    {Math.round(analysisResult.confidence * 100)}% confidence
                  </p>
                  {analysisResult.confidence_notes && (
                    <p className="text-xs text-amber-600 mt-0.5">{analysisResult.confidence_notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Barcode source badge + data quality warning */}
            {lastScannedCode && (
              barcodeDataQuality === 'ok' ? (
                <div className="flex items-center gap-2 bg-[#ECFDF5] border border-[#059669]/20 rounded-xl p-3">
                  <Barcode className="w-4 h-4 text-[#059669] flex-shrink-0" />
                  <p className="text-sm text-[#059669] font-medium">From barcode database · verified serving</p>
                </div>
              ) : barcodeDataQuality === 'serving_estimated' ? (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Nutrition data may be mixed</p>
                    <p className="text-xs text-amber-600 mt-0.5">Some macros estimated from 100g values — double-check and edit if needed. Your corrections save for next time.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Showing per-100g values</p>
                    <p className="text-xs text-amber-600 mt-0.5">No serving size in database. Check the package and adjust the numbers before saving. Your corrections save for next time.</p>
                  </div>
                </div>
              )
            )}

            {/* Live totals */}
            <div className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-bite-card">
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">Total</p>
              <div className="flex gap-4">
                {[
                  { val: liveTotals.calories, label: 'kcal', color: 'text-ink', size: 'text-2xl' },
                  { val: Math.round(liveTotals.protein_g), label: 'protein', color: 'text-bite', size: 'text-xl', suffix: 'g' },
                  { val: Math.round(liveTotals.carbs_g), label: 'carbs', color: 'text-[#3B82F6]', size: 'text-xl', suffix: 'g' },
                  { val: Math.round(liveTotals.fat_g), label: 'fat', color: 'text-[#F59E0B]', size: 'text-xl', suffix: 'g' },
                ].map((item) => (
                  <div key={item.label} className="text-center flex-1">
                    <p className={cn(item.size, 'font-bold', item.color)}>{item.val}{item.suffix ?? ''}</p>
                    <p className="text-xs text-ink-tertiary">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Editable items */}
            <div className="space-y-3">
              {editedItems.map((item, idx) => (
                <div key={idx} className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-bite-card">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <input
                      className="flex-1 text-sm font-semibold text-ink bg-transparent border-b border-transparent focus:border-surface-border focus:outline-none pb-0.5"
                      value={item.name}
                      onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSaveToLibrary(idx)}
                        disabled={savedToLibrary.has(idx)}
                        className="flex items-center gap-1 text-xs text-bite font-medium active:scale-95 transition-all disabled:opacity-50"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        {savedToLibrary.has(idx) ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={() => removeItem(idx)}
                        className="w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center text-ink-tertiary active:scale-90 transition-all"
                        aria-label="Remove item"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-ink-tertiary text-xs mb-3">{item.serving_description}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(['calories', 'protein_g', 'carbs_g', 'fat_g'] as const).map((field) => (
                      <div key={field}>
                        <label className="text-[10px] text-ink-tertiary uppercase tracking-wide block mb-1">
                          {field === 'calories' ? 'kcal' : field.replace('_g', '')}
                        </label>
                        <input
                          type="number"
                          className="w-full text-sm font-semibold text-ink bg-surface-elevated rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-bite/30 text-center"
                          value={item[field]}
                          onChange={(e) => updateItem(idx, field, e.target.value)}
                          inputMode="numeric"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Fix details / AI refinement loop ── */}
            {/* Only show for photo/text results — barcode doesn't need it */}
            {resultSource !== 'barcode' && (
              !showRefine ? (
                <button
                  onClick={() => setShowRefine(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-surface-border text-ink-secondary text-sm font-medium active:scale-95 transition-all bg-surface-card/50"
                >
                  <Edit3 className="w-4 h-4" />
                  Fix details (AI got something wrong)
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-amber-800">Correct the AI result</p>
                    <button
                      onClick={() => { setShowRefine(false); setRefineNote('') }}
                      className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 active:scale-90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-amber-700">
                    {resultSource === 'photo'
                      ? 'Describe what the AI missed about this photo'
                      : 'Describe what needs to be corrected'}
                  </p>
                  <textarea
                    className="w-full bg-white border border-amber-200 rounded-xl p-3 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-amber-400/40 resize-none"
                    rows={2}
                    placeholder={
                      resultSource === 'photo'
                        ? 'e.g. it was a 3x3, animal style, extra cheese…'
                        : 'e.g. double portion, had ranch dressing too…'
                    }
                    value={refineNote}
                    onChange={(e) => setRefineNote(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={runRefinement}
                    disabled={!refineNote.trim() || refining}
                    className={cn(
                      'w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95',
                      !refineNote.trim() || refining
                        ? 'bg-amber-100 text-amber-400'
                        : 'bg-amber-600 text-white'
                    )}
                  >
                    {refining ? 'Re-analyzing…' : 'Re-analyze with correction'}
                  </button>
                </div>
              )
            )}

            {/* Add More */}
            {!showAddMore ? (
              <button
                onClick={() => setShowAddMore(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-surface-border text-ink-secondary text-sm font-medium active:scale-95 transition-all bg-surface-card/50"
              >
                <Plus className="w-4 h-4" />
                Add more to this meal
              </button>
            ) : (
              <div className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-bite-card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Add more food</p>
                  <button
                    onClick={() => { setShowAddMore(false); setAddMoreText('') }}
                    className="w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center text-ink-tertiary active:scale-90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <textarea
                  className="w-full bg-surface-elevated rounded-xl p-3 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-bite/20 resize-none"
                  rows={2}
                  placeholder="e.g., also had a chicken breast..."
                  value={addMoreText}
                  onChange={(e) => setAddMoreText(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={runAddMoreAnalysis}
                  disabled={!addMoreText.trim() || addMoreAnalyzing}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95',
                    !addMoreText.trim() || addMoreAnalyzing
                      ? 'bg-surface-elevated text-ink-tertiary'
                      : 'bg-bite text-white'
                  )}
                >
                  {addMoreAnalyzing ? 'Analyzing…' : 'Analyze & Add'}
                </button>
              </div>
            )}

            {error && <ErrorBanner message={error} />}

            <button
              onClick={handleSaveAll}
              disabled={saving || editedItems.length === 0}
              className="w-full bg-bite text-white py-4 rounded-2xl text-base font-semibold active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving…' : `Add to ${MEAL_TYPE_LABELS[mealType]}`}
            </button>
          </div>
        )}

        {/* ── Manual entry ── */}
        {mode === 'manual' && (
          <div className="space-y-4 animate-slide-up">
            <div className="space-y-3">
              {/* Food name with autocomplete */}
              <div className="relative">
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-1">
                  Food name *
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 pr-10 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 text-base"
                    value={manualName}
                    onChange={(e) => { setManualName(e.target.value); setShowSuggestions(true) }}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="e.g., Chicken breast"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary">
                    {searchLoading
                      ? <div className="w-4 h-4 border-2 border-ink-tertiary/30 border-t-ink-tertiary rounded-full animate-spin" />
                      : <Search className="w-4 h-4" />
                    }
                  </div>
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-surface-card border border-surface-border rounded-2xl shadow-bite-card overflow-hidden max-h-64 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={() => selectSuggestion(s)}
                        className="w-full px-4 py-3 text-left border-b border-surface-border last:border-0 active:bg-surface-elevated transition-colors"
                      >
                        <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                        <p className="text-xs text-ink-tertiary mt-0.5">
                          {s.serving_description} · {s.calories} kcal · {s.protein_g}g protein
                        </p>
                      </button>
                    ))}
                    <p className="px-4 py-2 text-[10px] text-ink-tertiary bg-surface-elevated">
                      Data: Open Food Facts
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-1">Serving</label>
                <input
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 text-base"
                  value={manualServing}
                  onChange={(e) => setManualServing(e.target.value)}
                  placeholder="e.g., 1 cup, 150g"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Calories *', key: 'manualCals', val: manualCals, set: setManualCals, mode: 'numeric' },
                  { label: 'Protein (g)', key: 'manualProtein', val: manualProtein, set: setManualProtein, mode: 'decimal' },
                  { label: 'Carbs (g)', key: 'manualCarbs', val: manualCarbs, set: setManualCarbs, mode: 'decimal' },
                  { label: 'Fat (g)', key: 'manualFat', val: manualFat, set: setManualFat, mode: 'decimal' },
                ].map(({ label, key, val, set, mode: im }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-1">{label}</label>
                    <input
                      type="number"
                      className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 text-base"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder="0"
                      inputMode={im as 'numeric' | 'decimal'}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && <ErrorBanner message={error} />}

            <button
              onClick={handleSaveManual}
              disabled={!manualName || !manualCals || saving}
              className={cn(
                'w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-95',
                !manualName || !manualCals || saving
                  ? 'bg-surface-elevated text-ink-tertiary'
                  : 'bg-ink text-surface-card'
              )}
            >
              {saving ? 'Saving…' : `Add to ${MEAL_TYPE_LABELS[mealType]}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-red-600 text-sm">{message}</p>
    </div>
  )
}
