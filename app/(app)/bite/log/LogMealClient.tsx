'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Type, Camera, AlertCircle, CheckCircle2, Edit3, BookmarkPlus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { MealType, MEAL_TYPES, MEAL_TYPE_LABELS, MEAL_TYPE_EMOJI, MealAnalysisResult, MealAnalysisItem } from '@/lib/types/nutrition'
import { saveMealEntry, saveFoodToLibrary } from '@/lib/actions/nutrition'

type Mode = 'choose' | 'text' | 'photo' | 'result' | 'manual'

interface LogMealClientProps {
  initialMealType?: string
}

const isMealType = (v: string | undefined): v is MealType =>
  !!v && MEAL_TYPES.includes(v as MealType)

export default function LogMealClient({ initialMealType }: LogMealClientProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(initialMealType ? 'choose' : 'choose')
  const [mealType, setMealType] = useState<MealType>(
    isMealType(initialMealType) ? initialMealType : 'snack'
  )
  const [textInput, setTextInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null)
  const [editedItems, setEditedItems] = useState<MealAnalysisItem[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [, startNavTransition] = useTransition()
  const [savedToLibrary, setSavedToLibrary] = useState<Set<number>>(new Set())

  // Manual entry state
  const [manualName, setManualName] = useState('')
  const [manualServing, setManualServing] = useState('')
  const [manualCals, setManualCals] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')
  const [manualFat, setManualFat] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── AI Analysis ──────────────────────────────────────────────

  async function runTextAnalysis() {
    if (!textInput.trim()) return
    setAnalyzing(true)
    setError(null)
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
      setMode('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function runPhotoAnalysis() {
    if (!imageFile) return
    setAnalyzing(true)
    setError(null)
    try {
      const base64 = await fileToBase64(imageFile)
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          imageMimeType: imageFile.type,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setAnalysisResult(data.result)
      setEditedItems(data.result.items)
      setMode('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  // ── Save entries ─────────────────────────────────────────────

  async function handleSaveAll() {
    setSaving(true)
    setError(null)
    try {
      for (const item of editedItems) {
        await saveMealEntry({
          meal_type: mealType,
          source: textInput ? 'ai_text' : 'ai_photo',
          raw_input: textInput || undefined,
          name: item.name,
          serving_description: item.serving_description,
          quantity: item.quantity,
          calories: Math.round(item.calories),
          protein_g: Number(item.protein_g),
          carbs_g: Number(item.carbs_g),
          fat_g: Number(item.fat_g),
          fiber_g: item.fiber_g != null ? Number(item.fiber_g) : undefined,
          sugar_g: item.sugar_g != null ? Number(item.sugar_g) : undefined,
        })
      }
      startNavTransition(() => router.push('/bite'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed — please try again.')
      setSaving(false)
    }
  }

  async function handleSaveManual() {
    if (!manualName || !manualCals) return
    setSaving(true)
    setError(null)
    try {
      await saveMealEntry({
        meal_type: mealType,
        source: 'manual',
        name: manualName,
        serving_description: manualServing || undefined,
        calories: parseInt(manualCals) || 0,
        protein_g: parseFloat(manualProtein) || 0,
        carbs_g: parseFloat(manualCarbs) || 0,
        fat_g: parseFloat(manualFat) || 0,
      })
      startNavTransition(() => router.push('/bite'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed — please try again.')
      setSaving(false)
    }
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
    } catch {
      // non-critical
    }
  }

  function updateItem(idx: number, field: keyof MealAnalysisItem, value: string | number) {
    setEditedItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, [field]: typeof value === 'string' ? value : Number(value) } : item
    ))
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4">
        {mode !== 'choose' ? (
          <button
            onClick={() => { setMode('choose'); setError(null) }}
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
        <div>
          <h1 className="text-xl font-bold text-ink">
            {mode === 'choose' && 'Log a Meal'}
            {mode === 'text' && 'Describe Food'}
            {mode === 'photo' && 'Photo Analysis'}
            {mode === 'result' && 'Review & Edit'}
            {mode === 'manual' && 'Add Manually'}
          </h1>
        </div>
      </header>

      <div className="px-4 pb-8 space-y-4">

        {/* ── Meal type selector (always visible) ── */}
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
            {/* Text AI */}
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

            {/* Photo AI */}
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

            {/* Manual */}
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
                  <p className="text-ink-tertiary text-sm mt-0.5">Fill in nutrition yourself</p>
                </div>
              </div>
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

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

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
                <img
                  src={imagePreview}
                  alt="Food"
                  className="w-full h-52 object-cover rounded-2xl"
                />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="text-ink-tertiary text-sm underline"
                >
                  Choose different photo
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

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
            {/* Meal type at top */}
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

            {/* Confidence */}
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
                <p className={cn(
                  'text-sm font-medium',
                  analysisResult.confidence >= 0.75 ? 'text-green-700' : 'text-amber-700'
                )}>
                  {Math.round(analysisResult.confidence * 100)}% confidence
                </p>
                {analysisResult.confidence_notes && (
                  <p className="text-xs text-amber-600 mt-0.5">{analysisResult.confidence_notes}</p>
                )}
              </div>
            </div>

            {/* Total summary */}
            <div className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-bite-card">
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">Total</p>
              <div className="flex gap-4">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-ink">{analysisResult.total_calories}</p>
                  <p className="text-xs text-ink-tertiary">kcal</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xl font-bold text-bite">{Math.round(analysisResult.total_protein_g)}g</p>
                  <p className="text-xs text-ink-tertiary">protein</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xl font-bold text-[#3B82F6]">{Math.round(analysisResult.total_carbs_g)}g</p>
                  <p className="text-xs text-ink-tertiary">carbs</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xl font-bold text-[#F59E0B]">{Math.round(analysisResult.total_fat_g)}g</p>
                  <p className="text-xs text-ink-tertiary">fat</p>
                </div>
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
                    <button
                      onClick={() => handleSaveToLibrary(idx)}
                      disabled={savedToLibrary.has(idx)}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-bite font-medium active:scale-95 transition-all disabled:opacity-50"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      {savedToLibrary.has(idx) ? 'Saved' : 'Save'}
                    </button>
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

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSaveAll}
              disabled={saving}
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
              <div>
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-1">Food name *</label>
                <input
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 text-base"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g., Chicken breast"
                  autoFocus
                />
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
                <div>
                  <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-1">Calories *</label>
                  <input
                    type="number"
                    className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 text-base"
                    value={manualCals}
                    onChange={(e) => setManualCals(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 text-base"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 text-base"
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-1">Fat (g)</label>
                  <input
                    type="number"
                    className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 text-base"
                    value={manualFat}
                    onChange={(e) => setManualFat(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

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
