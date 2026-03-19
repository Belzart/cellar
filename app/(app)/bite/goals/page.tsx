import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getMyGoals } from '@/lib/actions/nutrition'
import GoalsClient from './GoalsClient'

export default async function GoalsPage() {
  const goals = await getMyGoals()

  return (
    <div
      className="min-h-screen pb-[calc(64px+env(safe-area-inset-bottom)+16px)]"
      style={{ background: '#F7F6F3' }}
    >
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4">
        <Link
          href="/bite"
          className="w-9 h-9 rounded-full bg-surface-card border border-surface-border flex items-center justify-center active:scale-95 shadow-bite-card"
        >
          <ChevronLeft className="w-4 h-4 text-ink" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink">Goals</h1>
          <p className="text-ink-tertiary text-xs mt-0.5">Set your daily targets</p>
        </div>
      </header>

      <div className="px-4">
        <GoalsClient initialGoals={goals} />
      </div>
    </div>
  )
}
