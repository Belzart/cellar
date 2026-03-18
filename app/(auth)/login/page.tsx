'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Wine } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState<'email' | 'otp'>('email')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const supabase = createClient()

  // Step 1 — send OTP code to email (no redirect link)
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

    if (error) {
      setError(error.message)
    } else {
      setStage('otp')
    }
  }

  // Step 2 — verify the 6-digit code
  async function handleVerifyOtp(code: string) {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    })

    setLoading(false)

    if (error) {
      setError('Invalid code. Check your email and try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } else {
      router.push('/')
      router.refresh()
    }
  }

  // Handle each digit input
  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are filled
    if (digit && index === 5) {
      const code = [...next].join('')
      if (code.length === 6) handleVerifyOtp(code)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Handle paste of full code
  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      handleVerifyOtp(text)
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

      {/* Form */}
      <div className="w-full max-w-sm animate-slide-up">
        {stage === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
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

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn-primary w-full text-center flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse-soft">Sending code…</span>
              ) : (
                'Send sign-in code'
              )}
            </button>

            <p className="text-text-tertiary text-xs text-center pt-2 leading-relaxed">
              We'll email you a 6-digit code — no password needed.
              Your wine history is private and belongs only to you.
            </p>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="card p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-wine-muted flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-lg font-medium text-cream mb-1">Check your email</h2>
              <p className="text-text-secondary text-sm">
                We sent a 6-digit code to <strong className="text-cream">{email}</strong>
              </p>
            </div>

            {/* OTP digit inputs */}
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-bg-card border border-border rounded-xl text-cream focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine transition-colors"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            {loading && (
              <p className="text-text-secondary text-sm text-center animate-pulse-soft">
                Verifying…
              </p>
            )}

            <button
              onClick={() => { setStage('email'); setError(null); setOtp(['', '', '', '', '', '']) }}
              className="w-full text-sm text-text-secondary underline text-center"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>

      <p className="mt-auto pt-12 text-text-tertiary text-xs text-center pb-safe pb-4">
        Cellar — Personal Wine Memory
      </p>
    </div>
  )
}
