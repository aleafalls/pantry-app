'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--background)' }}
    >
      {/* Logo / wordmark */}
      <div className="mb-10 text-center">
        <div className="text-4xl mb-3">🥫</div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: 'var(--foreground)' }}
        >
          Pantry
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Your shared household inventory
        </p>
      </div>

      {sent ? (
        /* ── Confirmation state ── */
        <div
          className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{ background: 'var(--glass-card)', backdropFilter: 'blur(14px)' }}
        >
          <div className="text-3xl mb-3">📬</div>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
            Check your email
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            We sent a sign-in link to <strong>{email}</strong>. Tap it to continue.
          </p>
          <p className="text-xs mt-4" style={{ color: 'var(--muted-light)' }}>
            Didn&apos;t get it? Check your spam folder or{' '}
            <button
              onClick={() => setSent(false)}
              className="underline"
              style={{ color: 'var(--amber)' }}
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        /* ── Email form ── */
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-600"
              style={{ color: 'var(--foreground)' }}
            >
              Enter your email to get started
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
              style={{
                background: 'oklch(100% 0 0 / 0.6)',
                borderColor: 'oklch(100% 0 0 / 0.5)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--red)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
            style={{
              background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
              color: '#4A3300',
            }}
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  )
}
