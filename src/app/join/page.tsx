'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import OnboardingTour from '@/components/onboarding/OnboardingTour'

// Same floating cards as onboarding but reordered/reused
const FLOATING_CARDS: {
  emoji: string
  size: number
  rotate: number
  anim: string
  duration: string
  delay: string
  top?: number
  bottom?: number
  left?: number
  right?: number
}[] = [
  { emoji: '🍳', size: 58, rotate:  7, anim: 'float-3', duration: '6.5s', delay: '0.3s', top: 28,    left: 10   },
  { emoji: '🥑', size: 60, rotate: -8, anim: 'float-1', duration: '7.8s', delay: '1.6s', top: 14,    right: 22  },
  { emoji: '🍋', size: 54, rotate:  5, anim: 'float-2', duration: '6.0s', delay: '0.9s', top: 130,   left: 30   },
  { emoji: '🧅', size: 56, rotate: -6, anim: 'float-4', duration: '8.4s', delay: '2.4s', top: 110,   right: 12  },
  { emoji: '🫙', size: 60, rotate:  9, anim: 'float-1', duration: '7.2s', delay: '3.2s', top: 260,   left: -8   },
  { emoji: '🥕', size: 54, rotate: -5, anim: 'float-3', duration: '5.8s', delay: '1.8s', top: 270,   right: -4  },
  { emoji: '🫚', size: 52, rotate:  4, anim: 'float-2', duration: '9.1s', delay: '0.6s', bottom: 300, left: 16  },
  { emoji: '🧄', size: 56, rotate: -7, anim: 'float-4', duration: '6.8s', delay: '2.9s', bottom: 290, right: 20 },
]

const GLASS_CARD: React.CSSProperties = {
  background: 'var(--glass-card)',
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.6)',
  boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
}

const BOTTOM_CARD: React.CSSProperties = {
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
}

type Household = { id: string; name: string }
type Step = 'checking' | 'tour' | 'code' | 'sendEmail' | 'checkEmail' | 'name'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [step, setStep] = useState<Step>('checking')
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // On load: if we arrived with a code (either from the invite link, or
  // bounced back here from the magic-link email via /auth/callback), resolve
  // it once and skip straight past whatever steps are already satisfied —
  // no re-entering the code, and no re-entering a name that's already set.
  // First-time (unauthenticated) visitors see the app tour before anything
  // else; returning from the magic-link email skips it, since they already saw it.
  useEffect(() => {
    let cancelled = false
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return

      const initialCode = searchParams.get('code')
      let hh: Household | null = null
      if (initialCode) {
        const normalizedCode = initialCode.trim().toUpperCase()
        const { data } = await supabase
          .rpc('get_household_by_invite_code', { p_invite_code: normalizedCode })
          .single()
        if (cancelled) return
        if (data) {
          hh = data as Household
          setHousehold(hh)
          setCode(normalizedCode)
        } else {
          setError("That code doesn't match any household. Double-check it and try again.")
        }
      }

      if (!user) {
        setStep('tour')
        return
      }

      if (!hh) { setStep('code'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      if (cancelled) return

      if (profile?.display_name) {
        await supabase.from('profiles').update({ household_id: hh.id }).eq('id', user.id)
        router.push('/')
        router.refresh()
        return
      }
      setStep('name')
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  function handleTourDone() {
    setStep(household ? 'sendEmail' : 'code')
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const normalizedCode = code.trim().toUpperCase()
    const { data, error } = await supabase
      .rpc('get_household_by_invite_code', { p_invite_code: normalizedCode })
      .single()
    if (error || !data) {
      setError("That code doesn't match any household. Double-check it and try again.")
      setLoading(false)
      return
    }
    setCode(normalizedCode)
    setHousehold(data as Household)
    setLoading(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStep('sendEmail')
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    if (profile?.display_name) {
      await supabase.from('profiles').update({ household_id: (data as Household).id }).eq('id', user.id)
      router.push('/')
      router.refresh()
      return
    }
    setStep('name')
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?invite_code=${encodeURIComponent(code.trim().toUpperCase())}` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false)
    setStep('checkEmail')
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!household) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), household_id: household.id })
      .eq('id', user.id)
    if (error) { setError('Something went wrong. Please try again.'); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--background)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Decorative blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', borderRadius: '50%', top: -60, left: -50, width: 260, height: 260, background: '#FFDD55', filter: 'blur(50px)', opacity: 0.28 }} />
        <div style={{ position: 'absolute', borderRadius: '50%', top: 120, right: -70, width: 220, height: 220, background: '#23967F', filter: 'blur(55px)', opacity: 0.18 }} />
        <div style={{ position: 'absolute', borderRadius: '50%', bottom: -40, left: 40, width: 240, height: 200, background: 'oklch(85% 0.09 30)', filter: 'blur(55px)', opacity: 0.15 }} />
      </div>

      {/* Floating emoji cards */}
      {FLOATING_CARDS.map((card, i) => (
        <div key={i} style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 1,
          animation: `${card.anim} ${card.duration} ease-in-out ${card.delay} infinite`,
          ...(card.top    !== undefined ? { top:    card.top    } : {}),
          ...(card.bottom !== undefined ? { bottom: card.bottom } : {}),
          ...(card.left   !== undefined ? { left:   card.left   } : {}),
          ...(card.right  !== undefined ? { right:  card.right  } : {}),
        }}>
          <div style={{ ...GLASS_CARD, width: card.size, height: card.size, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: card.size * 0.46, transform: `rotate(${card.rotate}deg)`, opacity: 0.82 }}>
            {card.emoji}
          </div>
        </div>
      ))}

      {/* Logo — centered in upper area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px 440px', position: 'relative', zIndex: 2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Lemmy" style={{ width: 80, height: 80 }} />
      </div>

      {/* Bottom card */}
      <div style={BOTTOM_CARD}>
        {step === 'checking' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Loading…</p>
          </div>
        ) : step === 'tour' ? (
          <>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleTourDone}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)', fontFamily: 'inherit', padding: 0 }}
              >
                Skip
              </button>
            </div>
            <OnboardingTour onDone={handleTourDone} />
          </>
        ) : step === 'code' ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
                Join a household
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Enter the invite code shared with you.
              </p>
            </div>
            <form onSubmit={handleCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Label htmlFor="code" style={{ color: 'var(--foreground)' }}>Invite code</Label>
              <Input
                id="code"
                type="text"
                required
                autoFocus
                placeholder="e.g. PINE-42"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="rounded-xl text-sm font-bold tracking-widest text-center"
                style={{ color: 'var(--foreground)' }}
              />
              {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>}
              <Button type="submit" variant="brand" disabled={loading || !code.trim()}
                style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '14px 16px', fontWeight: 700 }}>
                {loading ? 'Checking…' : 'Find household'}
              </Button>
              <a href="/onboarding" style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', textDecoration: 'none' }}>
                Create a new household instead →
              </a>
            </form>
          </>
        ) : step === 'sendEmail' ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
                Join {household?.name}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Enter your email to set up your account.
              </p>
            </div>
            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Label htmlFor="email" style={{ color: 'var(--foreground)' }}>Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-xl text-sm"
                style={{ color: 'var(--foreground)' }}
              />
              {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>}
              <Button type="submit" variant="brand" disabled={loading || !email.trim()}
                style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '14px 16px', fontWeight: 700 }}>
                {loading ? 'Sending…' : 'Send magic link'}
              </Button>
              <button type="button" onClick={() => setStep('code')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                <i className="fi-rr-angle-left" style={{ fontSize: 12, display: 'block', lineHeight: 1 }} />
                Back
              </button>
            </form>
          </>
        ) : step === 'checkEmail' ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
              Check your email
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
              We sent a sign-in link to <strong>{email}</strong>. Tap it to finish joining {household?.name} — no need to re-enter anything.
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted-light)', marginTop: 8 }}>
              Didn&apos;t get it? Check your spam or{' '}
              <button
                onClick={() => setStep('sendEmail')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--amber)', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}
              >
                try again
              </button>
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
                Join {household?.name}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                What should we call you in this household?
              </p>
            </div>
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Label htmlFor="name" style={{ color: 'var(--foreground)' }}>Your name</Label>
              <Input
                id="name"
                type="text"
                required
                autoFocus
                placeholder="e.g. Jon"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="rounded-xl text-sm"
                style={{ color: 'var(--foreground)' }}
              />
              {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>}
              <Button type="submit" variant="brand" disabled={loading || !displayName.trim()}
                style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '14px 16px', fontWeight: 700 }}>
                {loading ? 'Joining…' : 'Join household'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return <Suspense><JoinForm /></Suspense>
}
