'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import DrawerSelect from '@/components/ui/DrawerSelect'
import EmojiPicker from '@/components/ui/EmojiPicker'
import QuantityStepper from '@/components/add/QuantityStepper'
import TagInput from '@/components/add/TagInput'
import SuccessScreen from '@/components/add/SuccessScreen'
import { CATEGORIES, UNITS_GROUPED, LOCATIONS } from '@/lib/constants'

function NewItemForm() {
  const searchParams = useSearchParams()
  const shoppingListId = searchParams.get('shoppingListId')
  const barcode = searchParams.get('barcode')

  // ── Identity ──────────────────────────────────────────────
  function toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, c => c.toUpperCase())
  }

  const [name, setName] = useState(toTitleCase(searchParams.get('name') ?? ''))
  const [emoji, setEmoji] = useState('📦')

  // ── Stock ─────────────────────────────────────────────────
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('each')
  const [location, setLocation] = useState('pantry')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])

  // ── Details ───────────────────────────────────────────────
  const [lowThreshold, setLowThreshold] = useState(2)
  const [autoShoppingList, setAutoShoppingList] = useState(true)
  const [category, setCategory] = useState(searchParams.get('category') ?? '')
  const [preferredStores, setPreferredStores] = useState<string[]>([])
  const [householdStores, setHouseholdStores] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])

  // ── Meta ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('household_id').eq('id', user.id).single()
        .then(({ data: profile }) => {
          if (!profile?.household_id) return
          setHouseholdId(profile.household_id)
          supabase.from('stores').select('name').eq('household_id', profile.household_id).order('name')
            .then(({ data }) => setHouseholdStores((data ?? []).map(s => s.name)))
        })
    })
  }, [])

  async function addNewStore(storeName: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !householdId) return
    await supabase.from('stores').insert({ household_id: householdId, name: storeName })
    setHouseholdStores(prev => [...prev, storeName].sort())
    setPreferredStores(prev => [...prev, storeName])
  }

  const isValid = name.trim() && category && location && unit && quantity > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !householdId || !userId) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const itemId = crypto.randomUUID()

    const { error: itemError } = await supabase.from('items').insert({
      id: itemId,
      household_id: householdId,
      name: name.trim(),
      category,
      default_unit: unit,
      low_threshold: lowThreshold,
      emoji,
      tags,
      preferred_stores: preferredStores,
      auto_shopping_list: autoShoppingList,
      barcode: barcode || null,
      active: true,
    })

    if (itemError) { setError(itemError.message); setLoading(false); return }

    const { error: invError } = await supabase.from('inventory').insert({
      household_id: householdId,
      item_id: itemId,
      location,
      quantity,
      unit,
      purchase_date: purchaseDate,
      added_by: userId,
    })

    if (invError) { setError(invError.message); setLoading(false); return }

    if (shoppingListId) {
      await supabase.from('shopping_list')
        .update({ item_id: itemId, item_name: name.trim() })
        .eq('id', shoppingListId)
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <AppBackground>
        <SuccessScreen itemName={name.trim()} detail={`${quantity} ${unit} added to ${location}`} />
      </AppBackground>
    )
  }

  // ── Layout helpers (same pattern as ItemDetail) ───────────

  const detailRow = (left: React.ReactNode, right: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      <div style={{ width: 160, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )

  const sectionLabel = (label: string) => (
    <div style={{ padding: '8px 0 4px' }}>
      <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  )

  return (
    <AppBackground>
      <PageHeader title="New item" backHref="/add" />

      <form onSubmit={handleSubmit} style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Name + emoji (same row as Inventory Detail identity) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Input
            type="text"
            required
            autoFocus
            placeholder="Item name"
            value={name}
            autoCapitalize="words"
            onChange={e => setName(toTitleCase(e.target.value))}
            className="font-extrabold text-lg flex-1"
            style={{ color: 'var(--foreground)' }}
          />
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>

        {/* ── Stock ── */}
        {sectionLabel('Stock')}

        {detailRow(
          <Label>Quantity</Label>,
          <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
        )}

        {detailRow(
          <Label>Unit</Label>,
          <DrawerSelect
            title="Unit"
            value={unit}
            onChange={setUnit}
            groups={Object.entries(UNITS_GROUPED).map(([label, units]) => ({
              label,
              options: units.map(u => ({ value: u, label: u })),
            }))}
            searchable
          />
        )}

        {detailRow(
          <Label>Location</Label>,
          <DrawerSelect
            title="Location"
            value={location}
            onChange={setLocation}
            chipTrigger
            options={LOCATIONS.map(l => ({ value: l.value, label: `${l.emoji} ${l.label}` }))}
          />
        )}

        {detailRow(
          <Label>Purchase date</Label>,
          <Input
            type="date"
            value={purchaseDate}
            onChange={e => setPurchaseDate(e.target.value)}
            className="rounded-xl text-sm"
            style={{ width: 160, color: 'var(--foreground)' }}
          />
        )}

        {/* ── Details ── */}
        {sectionLabel('Details')}

        {detailRow(
          <Label>Auto add to shopping list</Label>,
          <button
            type="button"
            onClick={() => setAutoShoppingList(v => !v)}
            style={{
              width: 48, height: 28, borderRadius: 99, flexShrink: 0,
              background: autoShoppingList ? 'var(--yellow)' : 'var(--divider)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: autoShoppingList ? 23 : 3,
              width: 22, height: 22, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        )}

        {detailRow(
          <Label>Auto add when below</Label>,
          <QuantityStepper value={lowThreshold} onChange={setLowThreshold} min={0} />
        )}

        {detailRow(
          <Label>Category</Label>,
          <DrawerSelect
            title="Category"
            value={category}
            onChange={setCategory}
            placeholder="Select a category"
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
          />
        )}

        {detailRow(
          <Label>Preferred stores</Label>,
          <DrawerSelect
            title="Preferred Stores"
            multiple
            values={preferredStores}
            onChangeMultiple={setPreferredStores}
            placeholder="Add stores…"
            options={householdStores.map(s => ({ value: s, label: s }))}
            onAddNew={addNewStore}
            addNewPlaceholder="Add a store…"
          />
        )}

        <div>
          <Label style={{ display: 'block', marginBottom: 8 }}>
            Tags <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
          </Label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}

        <Button
          type="submit"
          variant="brand"
          disabled={loading || !isValid}
          style={{
            background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
            color: '#4A3300',
            padding: '14px 16px',
            marginTop: 8,
            marginBottom: 16,
          }}
        >
          {loading ? 'Saving…' : 'Save item'}
        </Button>
      </form>
    </AppBackground>
  )
}

export default function NewItemPage() {
  return <Suspense><NewItemForm /></Suspense>
}
