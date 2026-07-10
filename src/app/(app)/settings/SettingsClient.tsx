'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DrawerSelect from '@/components/ui/DrawerSelect'
import EmojiPicker, { AVATAR_EMOJI_GROUPS } from '@/components/ui/EmojiPicker'
import QuantityStepper from '@/components/add/QuantityStepper'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { US_STATES } from '@/lib/constants'
import { refetchEnrichment } from '@/lib/enrichment'

const AVATAR_COLORS = [
  { bg: '#FFD333', text: '#4A3300' },
  { bg: '#23967F', text: '#ffffff' },
  { bg: '#EE1B49', text: '#ffffff' },
  { bg: '#7C5CBF', text: '#ffffff' },
]

interface Household {
  id: string
  name: string
  invite_code: string
  city: string | null
  state: string | null
  default_servings: number
  owner_id: string | null
  shopping_tier: number
}

const SHOPPING_TIER_LABELS: Record<number, string> = {
  1: 'Budget', 3: 'Standard', 5: 'Premium',
}

interface Member {
  id: string
  display_name: string | null
  avatar_emoji: string | null
}

interface Props {
  userId: string
  displayName: string
  avatarEmoji: string | null
  household: Household
  members: Member[]
}

export default function SettingsClient({ userId, displayName, avatarEmoji, household, members }: Props) {
  const router = useRouter()

  const [householdName, setHouseholdName] = useState(household.name)
  const [city, setCity] = useState(household.city ?? '')
  const [state, setState] = useState(household.state ?? '')
  const [servings, setServings] = useState(household.default_servings)
  const [shoppingTier, setShoppingTier] = useState(household.shopping_tier)
  const [yourName, setYourName] = useState(displayName)
  const [emoji, setEmoji] = useState(avatarEmoji)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing, setRemoving] = useState(false)
  const [enrichingAll, setEnrichingAll] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number } | null>(null)

  const isOwner = userId === household.owner_id

  async function saveHouseholdName() {
    const trimmed = householdName.trim()
    if (!trimmed || trimmed === household.name) return
    const supabase = createClient()
    await supabase.from('households').update({ name: trimmed }).eq('id', household.id)
    router.refresh()
  }

  async function saveCity() {
    const trimmed = city.trim()
    if (trimmed === (household.city ?? '')) return
    const supabase = createClient()
    await supabase.from('households').update({ city: trimmed || null }).eq('id', household.id)
  }

  async function saveState(val: string) {
    setState(val)
    const supabase = createClient()
    await supabase.from('households').update({ state: val || null }).eq('id', household.id)
  }

  async function saveServings(val: number) {
    setServings(val)
    const supabase = createClient()
    await supabase.from('households').update({ default_servings: val }).eq('id', household.id)
  }

  async function saveShoppingTier() {
    const supabase = createClient()
    await supabase.from('households').update({ shopping_tier: shoppingTier }).eq('id', household.id)
  }

  async function saveYourName() {
    const trimmed = yourName.trim()
    if (!trimmed || trimmed === displayName) return
    const supabase = createClient()
    await supabase.from('profiles').update({ display_name: trimmed }).eq('id', userId)
    router.refresh()
  }

  async function saveAvatarEmoji(val: string) {
    setEmoji(val)
    const supabase = createClient()
    await supabase.from('profiles').update({ avatar_emoji: val }).eq('id', userId)
    router.refresh()
  }

  async function copyInviteLink() {
    const url = `${window.location.origin}/join?code=${household.invite_code}`
    await navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(household.invite_code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  async function removeMember() {
    if (!removeTarget) return
    setRemoving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ household_id: null }).eq('id', removeTarget.id)
    setRemoving(false)
    setRemoveTarget(null)
    router.refresh()
  }

  async function enrichAllItems() {
    setEnrichingAll(true)
    const supabase = createClient()
    const { data: items } = await supabase
      .from('items')
      .select('id, name, category, default_unit, emoji')
      .eq('household_id', household.id)
      .eq('active', true)
      .is('estimated_price', null)

    const list = items ?? []
    setEnrichProgress({ done: 0, total: list.length })

    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      const result = await refetchEnrichment({
        name: item.name,
        category: item.category,
        unit: item.default_unit,
        city,
        state,
        shoppingTier,
      })
      if (result) {
        // Only backfill price + (if still default) emoji — an existing
        // item's category/unit/location were already set deliberately when
        // it was added, so a bulk pass shouldn't silently change them.
        const updates: { estimated_price: number; emoji?: string } = { estimated_price: result.estimated_price }
        if (item.emoji === '📦' && result.emoji) updates.emoji = result.emoji
        await supabase.from('items').update(updates).eq('id', item.id)
      }
      setEnrichProgress({ done: i + 1, total: list.length })
    }

    setEnrichingAll(false)
    router.refresh()
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const sectionLabel = (label: string) => (
    <div style={{ padding: '8px 0 4px' }}>
      <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  )

  const detailRow = (left: React.ReactNode, right: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      <div style={{ width: 160, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )

  return (
    <AppBackground>
      <PageHeader title="Settings" backHref="/" />

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Household ── */}
        {sectionLabel('Household')}

        <div>
          <Label style={{ display: 'block', marginBottom: 8 }}>Household name</Label>
          <Input
            type="text"
            value={householdName}
            onChange={e => setHouseholdName(e.target.value)}
            onBlur={saveHouseholdName}
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="rounded-xl text-sm"
            style={{ color: 'var(--foreground)' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <Label style={{ flex: 1 }}>City</Label>
            <Label style={{ width: 120, flexShrink: 0 }}>State</Label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Input
              type="text"
              placeholder="e.g. Chicago"
              value={city}
              onChange={e => setCity(e.target.value)}
              onBlur={saveCity}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="rounded-xl text-sm"
              style={{ flex: 1, color: 'var(--foreground)' }}
            />
            <div style={{ width: 120, flexShrink: 0 }}>
              <DrawerSelect
                title="State"
                value={state}
                onChange={saveState}
                searchable
                options={US_STATES}
              />
            </div>
          </div>
        </div>

        <p className="text-11" style={{ color: 'var(--muted)', marginTop: -8 }}>
          Used to estimate pantry value and give Chef regional context.
        </p>

        {detailRow(
          <Label>Default servings</Label>,
          <QuantityStepper value={servings} onChange={saveServings} min={1} />
        )}

        <div>
          <Label style={{ display: 'block', marginBottom: 8 }}>Shopping style</Label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={shoppingTier}
            onChange={e => setShoppingTier(Number(e.target.value))}
            onMouseUp={saveShoppingTier}
            onTouchEnd={saveShoppingTier}
            onBlur={saveShoppingTier}
            style={{ width: '100%', accentColor: 'var(--yellow)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span className="text-11" style={{ color: 'var(--muted)' }}>{SHOPPING_TIER_LABELS[1]}</span>
            <span className="text-11" style={{ color: 'var(--muted)' }}>{SHOPPING_TIER_LABELS[3]}</span>
            <span className="text-11" style={{ color: 'var(--muted)' }}>{SHOPPING_TIER_LABELS[5]}</span>
          </div>
        </div>

        <p className="text-11" style={{ color: 'var(--muted)', marginTop: -8 }}>
          Helps AI estimate more accurate prices based on where you typically shop.
        </p>

        <button
          type="button"
          onClick={enrichAllItems}
          disabled={enrichingAll}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 12,
            border: '1.5px solid var(--divider)', background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: enrichingAll ? 'default' : 'pointer', fontFamily: 'inherit',
            color: 'var(--foreground)', fontSize: 14, fontWeight: 600,
          }}
        >
          <i
            className={enrichingAll ? 'fi-sr-sparkles' : 'fi-rr-sparkles'}
            style={{ fontSize: 15, display: 'block', lineHeight: 1, color: 'var(--amber)', animation: enrichingAll ? 'spin 1s linear infinite' : 'none' }}
          />
          {enrichingAll
            ? `Estimating prices… ${enrichProgress?.done ?? 0}/${enrichProgress?.total ?? 0}`
            : 'Estimate prices for existing items'}
        </button>
        <p className="text-11" style={{ color: 'var(--muted)', marginTop: -8 }}>
          Fills in price estimates for any item that doesn&apos;t have one yet — doesn&apos;t change category, unit, or location.
        </p>

        {/* ── Members ── */}
        {sectionLabel('Members')}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((member, i) => {
            const colors = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const initial = member.display_name?.[0]?.toUpperCase() ?? '?'
            return (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: colors.bg, color: colors.text,
                  fontSize: member.avatar_emoji ? 16 : 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {member.avatar_emoji ?? initial}
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)', flex: 1, minWidth: 0 }}>
                  {member.display_name ?? 'Unnamed'}
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                    {' '}({member.id === household.owner_id ? 'Owner' : 'Member'})
                  </span>
                </span>
                {isOwner && member.id !== userId && (
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(member)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--red)', fontSize: 13, fontWeight: 700,
                      fontFamily: 'inherit', padding: '4px 0', flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Invite ── */}
        {sectionLabel('Invite someone')}

        <button
          type="button"
          onClick={copyInviteCode}
          style={{
            width: '100%',
            padding: '14px 16px', borderRadius: 14,
            background: 'var(--surface)', border: '1.5px solid var(--divider)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span className="text-base font-extrabold tracking-003" style={{ color: 'var(--foreground)' }}>
            {household.invite_code}
          </span>
          <i
            className={copiedCode ? 'fi-sr-check' : 'fi-rr-copy'}
            style={{ fontSize: 16, display: 'block', lineHeight: 1, color: copiedCode ? 'var(--teal)' : 'var(--amber)' }}
          />
        </button>

        <Button
          type="button"
          variant="brand"
          onClick={copyInviteLink}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px',
            background: copiedLink ? 'var(--surface)' : 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
            color: copiedLink ? 'var(--foreground)' : '#4A3300',
            transition: 'all 0.3s',
          }}
        >
          <i className={copiedLink ? 'fi-sr-check' : 'fi-rr-link'} style={{ fontSize: 15, display: 'block', lineHeight: 1 }} />
          {copiedLink ? 'Link copied!' : 'Copy invite link'}
        </Button>

        {/* ── You ── */}
        {sectionLabel('Your name')}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input
            type="text"
            value={yourName}
            onChange={e => setYourName(e.target.value)}
            onBlur={saveYourName}
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="rounded-xl text-sm flex-1"
            style={{ color: 'var(--foreground)' }}
          />
          <EmojiPicker
            value={emoji}
            onChange={saveAvatarEmoji}
            groups={AVATAR_EMOJI_GROUPS}
            fallback="🙂"
            searchPlaceholder="Search avatar emojis…"
          />
        </div>

        {/* ── Sign out ── */}
        <div style={{ paddingTop: 8, paddingBottom: 8 }}>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              display: 'flex', padding: '14px 16px',
              border: '1.5px solid var(--divider)', background: 'var(--surface)',
              color: 'var(--red)', fontWeight: 700,
            }}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>

      </div>

      {/* ── Remove member confirmation ── */}
      <Sheet open={!!removeTarget} onOpenChange={o => !o && setRemoveTarget(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pt-6 pb-10"
          style={{ background: 'oklch(97% 0.006 85)', border: 'none' }}>
          <h2 className="text-lg font-extrabold text-center mb-2" style={{ color: 'var(--foreground)' }}>
            Remove {removeTarget?.display_name ?? 'this member'}?
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--muted)' }}>
            They&apos;ll lose access to {household.name} and its inventory, shopping list, and recipes. They can rejoin later with the invite code.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={removeMember}
              disabled={removing}
              style={{
                padding: '14px', borderRadius: 12, border: 'none',
                background: 'var(--red)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              {removing ? 'Removing…' : 'Yes, remove'}
            </button>
            <button
              onClick={() => setRemoveTarget(null)}
              style={{
                padding: '14px', borderRadius: 12,
                border: '1.5px solid var(--divider)', background: 'none',
                color: 'var(--foreground)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </AppBackground>
  )
}
