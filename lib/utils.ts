import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a rating (1-5) for display
export function formatRating(rating: number | null): string {
  if (rating == null) return '—'
  return rating.toFixed(1)
}

// Format cents as a price string
export function formatPrice(cents: number | null, currency = 'USD'): string {
  if (cents == null) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

// Format a date as a human-readable string
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Relative time (e.g., "2 months ago")
export function relativeTime(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diff = now.getTime() - then.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (months < 12) return `${months}mo ago`
  return `${years}y ago`
}

// Normalize text for fuzzy matching
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')     // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

// Style label with color
export const STYLE_COLORS: Record<string, string> = {
  red: 'bg-wine-muted text-wine-light border-wine/30',
  white: 'bg-stone/10 text-cream/80 border-stone/30',
  rosé: 'bg-pink-950/40 text-pink-300 border-pink-800/30',
  sparkling: 'bg-gold/10 text-gold-light border-gold/30',
  dessert: 'bg-amber-950/40 text-amber-300 border-amber-700/30',
  fortified: 'bg-orange-950/40 text-orange-300 border-orange-700/30',
  orange: 'bg-orange-950/30 text-orange-400 border-orange-700/30',
  other: 'bg-bg-card text-text-secondary border-border',
}

export const STYLE_LABELS: Record<string, string> = {
  red: 'Red',
  white: 'White',
  rosé: 'Rosé',
  sparkling: 'Sparkling',
  dessert: 'Dessert',
  fortified: 'Fortified',
  orange: 'Orange',
  other: 'Other',
}

// Get a public signed URL from Supabase storage path
// Use in server components — client should use supabase.storage.from().createSignedUrl()
export function buildStorageUrl(storagePath: string, bucket = 'cellar-images'): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/sign/${bucket}/${storagePath}`
}
