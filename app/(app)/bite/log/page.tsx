import { Suspense } from 'react'
import LogMealClient from './LogMealClient'

interface LogPageProps {
  searchParams: Promise<{ meal?: string }>
}

export default async function LogMealPage({ searchParams }: LogPageProps) {
  const { meal } = await searchParams
  return (
    <div
      className="min-h-screen pb-[calc(64px+env(safe-area-inset-bottom))]"
      style={{ background: '#F0EDE8' }}
    >
      <Suspense fallback={null}>
        <LogMealClient initialMealType={meal} />
      </Suspense>
    </div>
  )
}
