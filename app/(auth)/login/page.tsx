'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Wine } from 'lucide-react'

type Method = 'email' | 'phone'
type Stage = 'input' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [method, setMethod] = useState<Method>('email')
  const [contact, setContact] = useState('')
  const [stage, setStage] = useState<Stage>('input')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const supabase = createClient()

  function reset() {
    setStage('input')
    setOtp(['', '', '', '', '', ''])
    setError(null)
  }

  // Format phone to E.164 — assumes US if no country code
  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('1') && digits.length === 11) return `+${digits}`
    if (digits.length === 10) return `+1${digits}`
    return `+${digits}`
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim()) return
    setLoading(true)
    setError(null)

    let err
    if (method === 'email') {
      ;({ error: err } = await supabase.auth.signInWithOtp({
        email: contact.trim(),
        options: { shouldCreateUser: true },
      }))
    } else {
      ;({ error: err } = await supabase.auth.signInWithOtp({
        phone: formatPhone(contact),
        options: { shouldCreateUser: true },
      }))
    }

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setStage('otp')
    }
  }

  async function handleVerify(code: string) {
    setLoading(true)
    setError(null)

    let err
    if (method === 'email') {
      ;({ error: err } = await supabase.auth.verifyOtp({
        email: contact.trim(),
        token: code,
        type: 'email',
      }))
    } else {
      ;({ error: err } = await supabase.auth.verifyOtp({
        phone: formatPhone(contact),
        token: code,
        type: 'sms',
      }))
    }

    setLoading(false)
    if (err) {
      setError('Invalid code — check your ' + (method === 'email' ? 'email' : 'messages') + ' and try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } else {
      router.push('/')
      router.refresh()
    }
  }

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
    if (digit && index === 5) {
      const code = next.join('')
      if (code.length === 6) handleVerify(code)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      handleVerify(text)
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
        {stage === 'input' ? (
          <form onSubmit={handleSend} className="space-y-4">
            {/* Method toggle */}
            <div className="flex bg-bg-elevated rounded-xl p-1 border border-border">
              <button
                type="button"
                onClick={() => { setMethod('email'); setContact(''); setError(null) }}
                className={`flex-1 py-2 text-sm rounded-lg transition-colors font-medium ${
                  method === 'email'
                    ? 'bg-bg-card text-cream shadow-sm'
                    : 'text-text-secondary'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => { setMethod('phone'); setContact(''); setError(null) }}
                className={`flex-1 py-2 text-sm rounded-lg transition-colors font-medium ${
                  method === 'phone'
                    ? 'bg-bg-card text-cream shadow-sm'
                    : 'text-text-secondary'
                }`}
              >
                Phone
              </button>
            </div>

            {/* Input */}
            <div>
              <label htmlFor="contact" className="label mb-2 block">
                {method === 'email' ? 'Email address' : 'Phone number'}
              </label>
              {method === 'email' ? (
                <input
                  id="contact"
                  type="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="you@example.com"
                  className="input text-base"
                  autoComplete="email"
                  autoCapitalize="none"
                  inputMode="email"
                  required
                />
              ) : (
                <input
                  id="contact"
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="input text-base"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !contact.trim()}
              className="btn-primary w-full text-center flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse-soft">Sending code…</span>
              ) : (
                `Send sign-in code`
              )}
            </button>

            <p className="text-text-tertiary text-xs text-center pt-2 leading-relaxed">
              We'll send a 6-digit code — no password needed.
            </p>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="card p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-wine-muted flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">{method === 'email' ? '✉️' : '💬'}</span>
              </div>
              <h2 className="text-lg font-medium text-cream mb-1">
                {method === 'email' ? 'Check your email' : 'Check your messages'}
              </h2>
              <p className="text-text-secondary text-sm">
                We sent a 6-digit code to{' '}
                <strong className="text-cream">{contact}</strong>
              </p>
            </div>

            {/* OTP inputs */}
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
              <p className="text-text-secondary text-sm text-center animate-pulse-soft">Verifying…</p>
            )}

            <button
              onClick={reset}
              className="w-full text-sm text-text-secondary underline text-center"
            >
              Try a different {method === 'email' ? 'email' : 'number'}
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
