'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [displayName, setDisplayName] = useState('')
  const [step, setStep] = useState<'code' | 'name'>('code')
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('households')
      .select('id, name')
      .eq('invite_code', code.trim().toUpperCase())
      .single()

    if (error || !data) {
      setError("That code doesn't match any household. Double-check it and try again.")
      setLoading(false)
      return
    }

    setHousehold(data)
    setStep('name')
    setLoading(false)
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
    <div className="min-h-screen flex flex-col px-6 sm:px-12 py-16"
      style={{ background: 'var(--background)' }}>

      <div className="mb-10">
        <div className="text-4xl mb-3">🔑</div>
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
          {step === 'code' ? 'Join a household' : `Join ${household?.name}`}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {step === 'code' ? 'Enter the invite code shared with you.' : 'What should we call you?'}
        </p>
      </div>

      {step === 'code' ? (
        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code" style={{ color: 'var(--foreground)' }}>Invite code</Label>
            <Input
              id="code"
              type="text"
              required
              autoFocus
              placeholder="e.g. PINE-42"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="rounded-xl py-3 text-sm font-bold tracking-widest text-center"
              style={{ background: 'oklch(100% 0 0 / 0.6)', borderColor: 'oklch(100% 0 0 / 0.5)', color: 'var(--foreground)' }}
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}
          <Button type="submit" variant="brand" disabled={loading || !code.trim()}
            style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '12px 16px' }}>
            {loading ? 'Checking…' : 'Find household'}
          </Button>
          <a href="/onboarding" className="text-sm text-center" style={{ color: 'var(--muted)' }}>
            Create a new household instead →
          </a>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" style={{ color: 'var(--foreground)' }}>Your name</Label>
            <Input
              id="name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Jon"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="rounded-xl py-3 text-sm"
              style={{ background: 'oklch(100% 0 0 / 0.6)', borderColor: 'oklch(100% 0 0 / 0.5)', color: 'var(--foreground)' }}
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}
          <Button type="submit" variant="brand" disabled={loading || !displayName.trim()}
            style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '12px 16px' }}>
            {loading ? 'Joining…' : 'Join household'}
          </Button>
        </form>
      )}
    </div>
  )
}

export default function JoinPage() {
  return <Suspense><JoinForm /></Suspense>
}
