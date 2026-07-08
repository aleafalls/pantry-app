'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// Different emoji set from auth page to avoid repetition
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
  { emoji: '🍳', size: 58, rotate:  7, anim: 'float-3', duration: '6.5s', delay: '0.3s', top: 28,   left: 10   },
  { emoji: '🥑', size: 60, rotate: -8, anim: 'float-1', duration: '7.8s', delay: '1.6s', top: 14,   right: 22  },
  { emoji: '🍋', size: 54, rotate:  5, anim: 'float-2', duration: '6.0s', delay: '0.9s', top: 130,  left: 30   },
  { emoji: '🧅', size: 56, rotate: -6, anim: 'float-4', duration: '8.4s', delay: '2.4s', top: 110,  right: 12  },
  { emoji: '🫙', size: 60, rotate:  9, anim: 'float-1', duration: '7.2s', delay: '3.2s', top: 260,  left: -8   },
  { emoji: '🥕', size: 54, rotate: -5, anim: 'float-3', duration: '5.8s', delay: '1.8s', top: 270,  right: -4  },
  { emoji: '🫚', size: 52, rotate:  4, anim: 'float-2', duration: '9.1s', delay: '0.6s', bottom: 300, left: 16 },
  { emoji: '🧄', size: 56, rotate: -7, anim: 'float-4', duration: '6.8s', delay: '2.9s', bottom: 290, right: 20 },
]

const GLASS_CARD: React.CSSProperties = {
  background: 'var(--glass-card)',
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.6)',
  boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
}

function generateInviteCode() {
  const words = ['PINE', 'SAGE', 'MINT', 'BASIL', 'THYME', 'DILL', 'KALE', 'PLUM']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(10 + Math.random() * 90)
  return `${word}-${num}`
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'name' | 'household'>('name')
  const [displayName, setDisplayName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) return
    setStep('household')
  }

  async function handleHouseholdSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const householdId = crypto.randomUUID()
    const { error: householdError } = await supabase
      .from('households')
      .insert({ id: householdId, name: householdName.trim(), invite_code: generateInviteCode(), default_low_threshold: 2, owner_id: user.id })

    if (householdError) { setError(`Household error: ${householdError.message}`); setLoading(false); return }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: displayName.trim(), household_id: householdId })

    if (profileError) { setError(`Profile error: ${profileError.message}`); setLoading(false); return }

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

      {/* Decorative blobs — same as dashboard and auth */}
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

      {/* Floating emoji cards */}
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

      {/* Center content — logo only, card handles the text */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px 440px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Lemmy" style={{ width: 80, height: 80 }} />
      </div>

      {/* Bottom card — same style as auth page */}
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
        {/* Title + description */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 800, margin: '0 0 6px',
            color: 'var(--foreground)', letterSpacing: '-0.01em',
          }}>
            {step === 'name' ? "What's your name?" : 'Name your household'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            {step === 'name'
              ? "This is how you'll appear to your household members."
              : 'Pick something that feels like home.'}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--yellow)' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: step === 'household' ? 'var(--yellow)' : 'var(--divider)' }} />
        </div>

        {step === 'name' ? (
          <form onSubmit={handleNameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Label htmlFor="name" style={{ color: 'var(--foreground)' }}>Your name</Label>
            <Input
              id="name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Erica"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="rounded-xl text-sm"
              style={{ color: 'var(--foreground)' }}
            />
            <Button type="submit" variant="brand" disabled={!displayName.trim()}
              style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '14px 16px', fontWeight: 700 }}>
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleHouseholdSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Label htmlFor="household" style={{ color: 'var(--foreground)' }}>Household name</Label>
            <Input
              id="household"
              type="text"
              required
              autoFocus
              placeholder={`e.g. ${displayName}'s Pantry`}
              value={householdName}
              onChange={e => setHouseholdName(e.target.value)}
              className="rounded-xl text-sm"
              style={{ color: 'var(--foreground)' }}
            />
            {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>}
            <Button type="submit" variant="brand" disabled={loading || !householdName.trim()}
              style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '14px 16px', fontWeight: 700 }}>
              {loading ? 'Creating…' : 'Create household'}
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setStep('name')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fi-rr-angle-left" style={{ fontSize: 12, display: 'block', lineHeight: 1 }} />
                Back
              </button>
              <a href="/join" style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
                Join a household →
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
