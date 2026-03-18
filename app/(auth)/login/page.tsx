'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Wine } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState<'email' | 'otp'>('email')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })

    setLoading(false)
    if (error) setError(error.message)
    else setStage('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const token = code.replace(/\D/g, '').trim()
    if (!token) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    })

    setLoading(false)
    if (error) {
      setError('Invalid code — check your email and try again.')
      setCode('')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 pt-safe">
      {/* Hero */}
      <div className="flex flex-col items-center mb-12 animate-fade-in">
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

      <div className="w-full max-w-sm animate-slide-up">
        {stage === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="email" className="label mb-2 block">Email address</label>
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
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn-primary w-full text-center flex items-center justify-center gap-2"
            >
              {loading ? <span className="animate-pulse-soft">Sending code…</span> : 'Send sign-in code'}
            </button>
            <p className="text-text-tertiary text-xs text-center pt-2 leading-relaxed">
              We'll email you a sign-in code — no password needed.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="card p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-wine-muted flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-lg font-medium text-cream mb-1">Check your email</h2>
              <p className="text-text-secondary text-sm">
                We sent a sign-in code to <strong className="text-cream">{email}</strong>
              </p>
            </div>

            <div>
              <label htmlFor="code" className="label mb-2 block">Sign-in code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter your code"
                className="input text-center text-2xl font-bold tracking-widest"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn-primary w-full text-center flex items-center justify-center gap-2"
            >
              {loading ? <span className="animate-pulse-soft">Verifying…</span> : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => { setStage('email'); setError(null); setCode('') }}
              className="w-full text-sm text-text-secondary underline text-center"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>

      <p className="mt-auto pt-12 text-text-tertiary text-xs text-center pb-safe pb-4">
        Cellar — Personal Wine Memory
      </p>
    </div>
  )
}
