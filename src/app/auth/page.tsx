'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Glass card style matching the dashboard stat cards
const GLASS_CARD: React.CSSProperties = {
  background: 'var(--glass-card)',           // oklch(100% 0 0 / 0.35)
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.6)',
  boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
}

// Floating food emoji cards with positions and subtle rotations
const FLOATING_CARDS: {
  emoji: string
  size: number
  rotate: number
  anim: string   // keyframe name
  duration: string
  delay: string
  top?: number
  bottom?: number
  left?: number
  right?: number
}[] = [
  { emoji: '🍓', size: 56, rotate: -6, anim: 'float-1', duration: '6.0s', delay: '0.0s',  top: 24,    left: 6   },
  { emoji: '🍗', size: 61, rotate:  8, anim: 'float-2', duration: '7.2s', delay: '1.5s',  top: 10,    right: 16 },
  { emoji: '🥛', size: 58, rotate: -4, anim: 'float-3', duration: '5.6s', delay: '0.8s',  top: 112,   left: 36  },
  { emoji: '🥫', size: 58, rotate:  7, anim: 'float-4', duration: '8.1s', delay: '2.2s',  top: 242,   left: -8  },
  { emoji: '🧀', size: 63, rotate: -9, anim: 'float-1', duration: '6.8s', delay: '3.1s',  top: 392,   left: -14 },
  { emoji: '🫒', size: 58, rotate:  5, anim: 'float-2', duration: '7.5s', delay: '1.2s',  top: 252,   right: -4 },
  { emoji: '🥚', size: 52, rotate: -3, anim: 'float-3', duration: '5.0s', delay: '2.8s',  top: 422,   right: 14 },
  { emoji: '🍞', size: 56, rotate:  8, anim: 'float-4', duration: '9.0s', delay: '0.4s',  bottom: 212, left: -4 },
  { emoji: '🍎', size: 63, rotate: -6, anim: 'float-1', duration: '6.3s', delay: '3.8s',  bottom: 165, right: -4 },
  { emoji: '🥩', size: 58, rotate: -4, anim: 'float-2', duration: '7.8s', delay: '2.0s',  bottom: 275, left: 148 },
]

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Surface a failed magic-link exchange (see src/app/auth/callback/route.ts)
  // — kept as a fallback path for anyone who taps the link instead of
  // entering the code, e.g. on a device where the installed home-screen
  // app and the regular browser are separate storage contexts and the
  // code is the only path that works reliably there.
  useEffect(() => {
    const callbackError = searchParams.get('error')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: surface a failed magic-link exchange from the callback redirect
    if (callbackError) setError(callbackError)
  }, [searchParams])

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setStep('code')
    setLoading(false)
  }

  async function verifyCode(e?: React.FormEvent) {
    e?.preventDefault()
    if (code.trim().length < 6) return
    setVerifying(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    if (error) { setError(error.message); setVerifying(false); return }
    router.push('/')
    router.refresh()
  }

  // Auto-submit as soon as a 6-digit code is present — covers both the
  // native mail-app autofill suggestion and manual entry.
  useEffect(() => {
    if (step === 'code' && code.trim().length === 6 && !verifying) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: auto-submit once a full 6-digit code is present (autofill or manual entry)
      verifyCode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the code value changes
  }, [code])

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--background)',   // same warm cream as dashboard
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Decorative blobs — exact same as dashboard */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute', borderRadius: '50%',
          top: -60, left: -50, width: 260, height: 260,
          background: '#FFDD55', filter: 'blur(50px)', opacity: 0.28,
        }} />
        <div style={{
          position: 'absolute', borderRadius: '50%',
          top: 120, right: -70, width: 220, height: 220,
          background: '#23967F', filter: 'blur(55px)', opacity: 0.18,
        }} />
        <div style={{
          position: 'absolute', borderRadius: '50%',
          bottom: -40, left: 40, width: 240, height: 200,
          background: 'oklch(85% 0.09 30)', filter: 'blur(55px)', opacity: 0.15,
        }} />
      </div>

      {/* Floating emoji cards — outer wrapper animates translation, inner div holds rotation */}
      {FLOATING_CARDS.map((card, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 1,
            animation: `${card.anim} ${card.duration} ease-in-out ${card.delay} infinite`,
            ...(card.top    !== undefined ? { top:    card.top    } : {}),
            ...(card.bottom !== undefined ? { bottom: card.bottom } : {}),
            ...(card.left   !== undefined ? { left:   card.left   } : {}),
            ...(card.right  !== undefined ? { right:  card.right  } : {}),
          }}
        >
          <div style={{
            ...GLASS_CARD,
            width: card.size,
            height: card.size,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: card.size * 0.46,
            transform: `rotate(${card.rotate}deg)`,
            opacity: 0.82,
          }}>
            {card.emoji}
          </div>
        </div>
      ))}

      {/* Center content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px 280px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Lemmy" style={{ width: 88, height: 88, marginBottom: 20 }} />

        {/* Wordmark */}
        <h1 style={{
          fontSize: 30, fontWeight: 800, margin: '0 0 8px',
          color: 'var(--foreground)', letterSpacing: '-0.02em',
        }}>
          Lemmy
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: 15, color: 'var(--muted)', textAlign: 'center',
          margin: '0 0 28px', lineHeight: 1.5, maxWidth: 260,
        }}>
          Your pantry companion to help cook what you have
        </p>

        {/* Feature pills — glass card style, 2 + 1 layout */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <FeaturePill icon="fi-sr-box"    label="Track pantry" />
            <FeaturePill icon="fi-sr-user-chef" label="Get recipes" />
          </div>
          <FeaturePill icon="fi-sr-users" label="Share w/ household" />
        </div>
      </div>

      {/* Login card — 20px from sides and bottom, all corners rounded */}
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: 'max(20px, calc(50% - 310px))',
        right: 'max(20px, calc(50% - 310px))',
        zIndex: 10,
        background: 'oklch(99% 0.003 85 / 0.92)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderRadius: 24,
        padding: '24px 24px 28px',
        border: '1px solid oklch(100% 0 0 / 0.6)',
        boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 8px 32px -8px',
      }}>
        {step === 'code' ? (
          <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', margin: '0 0 6px' }}>
                Enter your code
              </h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                We sent a 6-digit code to <strong>{email}</strong>.
              </p>
            </div>
            <Input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="rounded-xl text-center"
              style={{ color: 'var(--foreground)', fontSize: 22, letterSpacing: '0.3em', fontWeight: 700 }}
            />
            {error && (
              <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>
            )}
            <Button
              type="submit"
              variant="brand"
              disabled={verifying || code.trim().length < 6}
              style={{
                background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
                color: '#4A3300',
                padding: '14px 16px',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {verifying ? 'Verifying…' : 'Verify & sign in'}
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <i className="fi-rr-angle-left" style={{ fontSize: 12, display: 'block', lineHeight: 1 }} />
                Use a different email
              </button>
              <button
                type="button"
                onClick={e => requestCode(e as unknown as React.FormEvent)}
                disabled={loading}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--amber)', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}
              >
                {loading ? 'Sending…' : 'Resend code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={requestCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', margin: 0 }}>
              Enter your email to get started or log in
            </p>
            <Input
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rounded-xl text-sm"
              style={{ color: 'var(--foreground)' }}
            />
            {error && (
              <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>
            )}
            <Button
              type="submit"
              variant="brand"
              disabled={loading || !email}
              style={{
                background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
                color: '#4A3300',
                padding: '14px 16px',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {loading ? 'Sending…' : 'Send code'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}

function FeaturePill({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '9px 18px', borderRadius: 99,
      // Glass card treatment matching stat cards
      background: 'var(--glass-card)',
      backdropFilter: 'blur(14px) saturate(180%)',
      WebkitBackdropFilter: 'blur(14px) saturate(180%)',
      border: '1px solid oklch(100% 0 0 / 0.6)',
      boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
      fontSize: 14, fontWeight: 600, color: 'var(--foreground)',
      whiteSpace: 'nowrap',
    }}>
      <i className={icon} style={{ fontSize: 15, display: 'block', lineHeight: 1, color: 'var(--foreground)' }} />
      {label}
    </div>
  )
}
