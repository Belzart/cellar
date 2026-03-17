'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ScanProgressProps {
  stage: 'uploading' | 'extracting' | 'matching' | 'done' | 'error'
  error?: string | null
}

const STAGES = [
  { key: 'uploading',  label: 'Uploading image…'          },
  { key: 'extracting', label: 'Reading the label…'         },
  { key: 'matching',   label: 'Searching your cellar…'     },
  { key: 'done',       label: 'Done!'                      },
]

export default function ScanProgress({ stage, error }: ScanProgressProps) {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (stage === 'done' || stage === 'error') return
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'))
    }, 400)
    return () => clearInterval(interval)
  }, [stage])

  const currentIndex = STAGES.findIndex((s) => s.key === stage)

  if (stage === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/30 flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="font-display text-xl font-medium text-cream mb-2">Something went wrong</h3>
        <p className="text-text-secondary text-sm">{error ?? 'Please try again.'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      {/* Animated wine drop */}
      <div className="w-20 h-20 rounded-3xl gradient-wine flex items-center justify-center mb-8 shadow-wine animate-pulse-soft">
        <span className="text-3xl">🍷</span>
      </div>

      {/* Current step label */}
      <h3 className="font-display text-xl font-medium text-cream mb-6">
        {stage === 'done'
          ? 'Ready to review'
          : `${STAGES.find((s) => s.key === stage)?.label ?? ''}${dots}`
        }
      </h3>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mt-2">
        {STAGES.filter((s) => s.key !== 'done').map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-500',
                i < currentIndex
                  ? 'bg-wine-light w-6'
                  : i === currentIndex
                  ? 'bg-wine animate-pulse-soft'
                  : 'bg-border-strong'
              )}
            />
          </div>
        ))}
      </div>

      <p className="text-text-tertiary text-xs mt-4">
        This usually takes 5–10 seconds
      </p>
    </div>
  )
}
