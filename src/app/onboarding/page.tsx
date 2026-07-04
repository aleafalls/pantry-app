'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

    // Generate the household ID client-side so we don't need to SELECT after INSERT
    // (SELECT would fail — the user isn't a member yet when the row is first created)
    const householdId = crypto.randomUUID()

    const { error: householdError } = await supabase
      .from('households')
      .insert({
        id: householdId,
        name: householdName.trim(),
        invite_code: generateInviteCode(),
        default_low_threshold: 2,
      })

    if (householdError) {
      setError(`Household error: ${householdError.message}`)
      setLoading(false)
      return
    }

    // Upsert the profile (handles both new and existing rows)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName.trim(),
        household_id: householdId,
      })

    if (profileError) {
      setError(`Profile error: ${profileError.message}`)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex flex-col px-6 py-16"
      style={{ background: 'var(--background)' }}
    >
      <div className="mb-10">
        <div className="text-4xl mb-3">🥫</div>
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
          {step === 'name' ? "What's your name?" : 'Name your household'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {step === 'name'
            ? 'This is how you\'ll appear to your household members.'
            : 'Pick something that feels like home.'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        <div
          className="h-1 flex-1 rounded-full"
          style={{ background: 'var(--yellow)' }}
        />
        <div
          className="h-1 flex-1 rounded-full"
          style={{ background: step === 'household' ? 'var(--yellow)' : 'var(--divider)' }}
        />
      </div>

      {step === 'name' ? (
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            required
            autoFocus
            placeholder="e.g. Erica"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
            style={{
              background: 'oklch(100% 0 0 / 0.6)',
              borderColor: 'oklch(100% 0 0 / 0.5)',
              color: 'var(--foreground)',
            }}
          />
          <button
            type="submit"
            disabled={!displayName.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{
              background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
              color: '#4A3300',
            }}
          >
            Continue
          </button>
        </form>
      ) : (
        <form onSubmit={handleHouseholdSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            required
            autoFocus
            placeholder={`e.g. ${displayName}'s Pantry`}
            value={householdName}
            onChange={e => setHouseholdName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
            style={{
              background: 'oklch(100% 0 0 / 0.6)',
              borderColor: 'oklch(100% 0 0 / 0.5)',
              color: 'var(--foreground)',
            }}
          />

          {error && (
            <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !householdName.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{
              background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
              color: '#4A3300',
            }}
          >
            {loading ? 'Creating…' : 'Create household'}
          </button>

          <button
            type="button"
            onClick={() => setStep('name')}
            className="text-sm text-center"
            style={{ color: 'var(--muted)' }}
          >
            ← Back
          </button>

          <div
            className="mt-4 p-4 rounded-xl text-sm text-center"
            style={{ background: 'var(--surface)' }}
          >
            <p style={{ color: 'var(--muted)' }}>
              Joining someone else&apos;s household instead?{' '}
              <a href="/join" style={{ color: 'var(--amber)', fontWeight: 700 }}>
                Enter invite code
              </a>
            </p>
          </div>
        </form>
      )}
    </div>
  )
}
