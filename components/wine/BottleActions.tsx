'use client'

import { useState, useTransition } from 'react'
import { drinkBottle, removeFromBottles, addToBottles } from '@/lib/actions/inventory'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  inventoryId: string
  quantity: number
  wineId: string
}

export default function BottleActions({ inventoryId, quantity: initialQty, wineId }: Props) {
  const [qty, setQty] = useState(initialQty)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDrink() {
    startTransition(async () => {
      await drinkBottle(inventoryId)
      const newQty = qty - 1
      setQty(newQty)
      if (newQty <= 0) router.refresh()
    })
  }

  function handleAdd() {
    startTransition(async () => {
      await addToBottles({ wine_id: wineId, quantity: 1 })
      setQty((q) => q + 1)
    })
  }

  function handleRemove() {
    startTransition(async () => {
      await removeFromBottles(inventoryId)
      router.refresh()
    })
  }

  if (qty <= 0) return null

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDrink}
          disabled={isPending}
          className="w-7 h-7 rounded-lg bg-bg-elevated border border-border flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
        >
          <Minus className="w-3 h-3 text-text-secondary" />
        </button>
        <span className="text-cream text-sm font-medium w-5 text-center">{qty}</span>
        <button
          onClick={handleAdd}
          disabled={isPending}
          className="w-7 h-7 rounded-lg bg-bg-elevated border border-border flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
        >
          <Plus className="w-3 h-3 text-text-secondary" />
        </button>
      </div>
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="flex items-center gap-1 text-text-tertiary text-xs active:text-red-400 transition-colors disabled:opacity-40"
      >
        <Trash2 className="w-3 h-3" />
        Remove
      </button>
    </div>
  )
}
