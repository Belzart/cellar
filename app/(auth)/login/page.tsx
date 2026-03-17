'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wine } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 pt-safe">
      {/* Hero */}
      <div className="flex flex-col items-center mb-12 animate-fade-in">
        {/* Logo mark */}
        <div className="w-20 h-20 rounded-3xl gradient-wine flex items-center justify-center mb-6 shadow-wine">
          <Wine className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>

        <h1 className="font-display text-4xl font-medium text-cream tracking-tight mb-2">
          Cellar
        </h1>
        <p className="text-text-secondary text-center text-base leading-relaxed max-w-xs">
          Your personal wine memory. Every bottle, every moment.
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm animate-slide-up">
        {sent ? (
          <div className="card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-wine-muted flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✉️</span>
            </div>
            <h2 className="text-lg font-medium text-cream mb-2">Check your email</h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              We sent a magic link to <strong className="text-cream">{email}</strong>.
              Tap it to sign in — no password needed.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-sm text-text-secondary underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label mb-2 block">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input text-base"
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn-primary w-full text-center flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse-soft">Sending link…</span>
              ) : (
                'Continue with email'
              )}
            </button>

            <p className="text-text-tertiary text-xs text-center pt-2 leading-relaxed">
              We'll send you a magic link — no password required.
              Your wine history is private and belongs only to you.
            </p>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="mt-auto pt-12 text-text-tertiary text-xs text-center pb-safe pb-4">
        Cellar — Personal Wine Memory
      </p>
    </div>
  )
}
