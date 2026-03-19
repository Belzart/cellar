import Link from 'next/link'
import { ChevronLeft, PlusCircle } from 'lucide-react'
import { getSavedFoods, getRecentEntries } from '@/lib/actions/nutrition'
import LibraryClient from './LibraryClient'

export default async function LibraryPage() {
  const [savedFoods, recentEntries] = await Promise.all([
    getSavedFoods(),
    getRecentEntries(10),
  ])

  return (
    <div
      className="min-h-screen pb-[calc(64px+env(safe-area-inset-bottom)+16px)]"
      style={{ background: '#EFECE6' }}
    >
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/bite"
            className="w-9 h-9 rounded-full bg-surface-card border border-surface-border flex items-center justify-center active:scale-95 shadow-bite-card"
          >
            <ChevronLeft className="w-4 h-4 text-ink" />
          </Link>
          <h1 className="text-xl font-bold text-ink">Library</h1>
        </div>
        <Link
          href="/bite/log"
          className="flex items-center gap-1.5 text-bite text-sm font-semibold"
        >
          <PlusCircle className="w-4 h-4" />
          Add
        </Link>
      </header>

      <div className="px-4 space-y-6">
        <LibraryClient savedFoods={savedFoods} recentEntries={recentEntries} />
      </div>
    </div>
  )
}
