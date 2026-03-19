'use client'

import { useState, useTransition } from 'react'
import { addToBottles, drinkBottle, removeFromBottles } from '@/lib/actions/inventory'
import { Wine as WineIcon, Minus, Plus, Package } from 'lucide-react'
import { CellarInventory } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  wineId: string
  wineName: string
  currentBottle: CellarInventory | null
}

export default function AddToBottlesButton({ wineId, wineName: _, currentBottle }: Props) {
  const [bottle, setBottle] = useState<CellarInventory | null>(currentBottle)
  const [isPending, startTransition] = useTransition()
  const [showAdded, setShowAdded] = useState(false)

  async function handleAdd() {
    startTransition(async () => {
      const result = await addToBottles({ wine_id: wineId, quantity: 1 })
      if (!result.error) {
        // Optimistically update — re-fetch would be cleaner but this is fine for single user
        setBottle(prev => prev
          ? { ...prev, quantity: prev.quantity + 1 }
          : {
              id: 'temp',
              user_id: '',
              wine_id: wineId,
              quantity: 1,
              purchase_date: null,
              purchase_price_cents: null,
              purchase_currency: 'USD',
              storage_note: null,
              added_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
        )
        setShowAdded(true)
        setTimeout(() => setShowAdded(false), 2000)
      }
    })
  }

  async function handleDrink() {
    if (!bottle) return
    startTransition(async () => {
      await drinkBottle(bottle.id)
      const newQty = bottle.quantity - 1
      setBottle(newQty <= 0 ? null : { ...bottle, quantity: newQty })
    })
  }

  async function handleRemove() {
    if (!bottle) return
    startTransition(async () => {
      await removeFromBottles(bottle.id)
      setBottle(null)
    })
  }

  if (bottle && bottle.quantity > 0) {
    return (
      <div className="card px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-wine/15 border border-wine/25 flex items-center justify-center">
            <Package className="w-4 h-4 text-wine-light" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-cream text-sm font-medium">In My Bottles</p>
            <p className="text-text-tertiary text-xs">
              {bottle.quantity} bottle{bottle.quantity !== 1 ? 's' : ''} at home
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDrink}
            disabled={isPending}
            className="w-8 h-8 rounded-xl bg-bg-elevated border border-border flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
          >
            <Minus className="w-3.5 h-3.5 text-text-secondary" />
          </button>
          <span className="text-cream text-sm font-medium w-6 text-center">{bottle.quantity}</span>
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="w-8 h-8 rounded-xl bg-bg-elevated border border-border flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5 text-text-secondary" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleAdd}
      disabled={isPending}
      className={cn(
        'w-full card px-4 py-3 flex items-center gap-3 active:scale-95 transition-all duration-150 disabled:opacity-50',
        showAdded && 'border-wine/40'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
        showAdded ? 'bg-wine/20 border border-wine/30' : 'bg-bg-elevated border border-border'
      )}>
        {showAdded
          ? <Package className="w-4 h-4 text-wine-light" strokeWidth={1.5} />
          : <WineIcon className="w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
        }
      </div>
      <div className="text-left">
        <p className={cn('text-sm font-medium', showAdded ? 'text-wine-light' : 'text-text')}>
          {showAdded ? 'Added to My Bottles' : 'Add to My Bottles'}
        </p>
        <p className="text-text-tertiary text-xs">Track bottles you have at home</p>
      </div>
    </button>
  )
}
