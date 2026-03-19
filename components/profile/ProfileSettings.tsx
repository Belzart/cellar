'use client'

import { useState, useTransition } from 'react'
import { updateMyProfile } from '@/lib/actions/profile'
import { Check, Loader2 } from 'lucide-react'

interface Props {
  initialDisplayName: string
  initialCellarName: string
  email: string
}

export default function ProfileSettings({ initialDisplayName, initialCellarName, email }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [cellarName, setCellarName] = useState(initialCellarName)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateMyProfile({ display_name: displayName, cellar_name: cellarName })
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <div className="card p-4 space-y-4">
      {/* Email — read only */}
      {email && (
        <div>
          <label className="text-text-tertiary text-xs block mb-1.5">Account email</label>
          <p className="text-text-secondary text-sm">{email}</p>
        </div>
      )}

      <div className="h-px bg-border" />

      {/* Display name */}
      <div>
        <label className="text-text-tertiary text-xs block mb-1.5">
          Your name <span className="text-text-tertiary">(used in greeting)</span>
        </label>
        <input
          className="input text-sm"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Ryan"
          maxLength={40}
        />
      </div>

      {/* Cellar name */}
      <div>
        <label className="text-text-tertiary text-xs block mb-1.5">
          Cellar name <span className="text-text-tertiary">(shown on home screen)</span>
        </label>
        <input
          className="input text-sm"
          value={cellarName}
          onChange={(e) => setCellarName(e.target.value)}
          placeholder="e.g. Ryan's Cellar"
          maxLength={50}
        />
        <p className="text-text-tertiary text-xs mt-1">
          Try: "Belza Cellar", "Sunday Bottles", "My Wine Memory"
        </p>
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : (
          'Save'
        )}
      </button>
    </div>
  )
}
