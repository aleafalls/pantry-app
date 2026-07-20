'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import DrawerSelect from '@/components/ui/DrawerSelect'
import EmojiPicker from '@/components/ui/EmojiPicker'
import QuantityStepper from '@/components/add/QuantityStepper'
import TagInput from '@/components/add/TagInput'
import { CATEGORIES, UNITS_GROUPED, LOCATIONS } from '@/lib/constants'
import { getOrFetchEnrichment, refetchEnrichment, type EnrichmentResult } from '@/lib/enrichment'
import { fetchItemTagSuggestions } from '@/lib/tagSuggestions'
import { canonicalizeIngredients } from '@/lib/ingredientCanonicalize'

function NewItemForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shoppingListId = searchParams.get('shoppingListId')
  const barcode = searchParams.get('barcode')
  const catalogId = searchParams.get('catalogId')

  // ── Identity ──────────────────────────────────────────────
  function toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, c => c.toUpperCase())
  }

  const [name, setName] = useState(toTitleCase(searchParams.get('name') ?? ''))
  const [emoji, setEmoji] = useState(searchParams.get('emoji') ?? '📦')

  // ── Stock ─────────────────────────────────────────────────
  // Arriving from a shopping-list entry means this is being catalogued,
  // not confirmed as purchased yet — default to 0 on hand rather than
  // silently claiming you already have one. Any entry point can still be
  // saved at 0 (tracking something you don't have yet), which combined
  // with the default "auto add to shopping list" below puts it straight
  // on the list.
  const [quantity, setQuantity] = useState(shoppingListId ? 0 : 1)
  const [unit, setUnit] = useState(searchParams.get('unit') ?? 'each')
  const [location, setLocation] = useState(searchParams.get('location') ?? 'pantry')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])

  // ── Details ───────────────────────────────────────────────
  const [lowThreshold, setLowThreshold] = useState(1)
  const [autoShoppingList, setAutoShoppingList] = useState(true)
  const [category, setCategory] = useState(searchParams.get('category') ?? '')
  const [preferredStores, setPreferredStores] = useState<string[]>([])
  const [householdStores, setHouseholdStores] = useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>(() => {
    const raw = searchParams.get('tags')
    return raw ? raw.split(',').filter(Boolean) : []
  })
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null)
  const [canonicalName, setCanonicalName] = useState<string | null>(null)

  // ── AI enrichment ─────────────────────────────────────────
  const [enriching, setEnriching] = useState(false)
  const [householdCity, setHouseholdCity] = useState<string | null>(null)
  const [householdState, setHouseholdState] = useState<string | null>(null)
  const [shoppingTier, setShoppingTier] = useState<number | null>(null)

  // ── Meta ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Only fills a field if it's still at its default/empty value — never
  // overwrites something the user (or an earlier enrichment pass) already set.
  function applyEnrichment(result: EnrichmentResult) {
    if (result.category) setCategory(prev => prev === '' ? result.category! : prev)
    if (result.unit) setUnit(prev => prev === 'each' ? result.unit! : prev)
    if (result.location) setLocation(prev => prev === 'pantry' ? result.location! : prev)
    if (result.emoji) setEmoji(prev => prev === '📦' ? result.emoji : prev)
    setEstimatedPrice(result.estimated_price)
    setCanonicalName(result.canonical_name)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles')
        .select('household_id, households(city, state, shopping_tier)')
        .eq('id', user.id).single()
        .then(({ data: profile }) => {
          if (!profile?.household_id) return
          setHouseholdId(profile.household_id)
          supabase.from('stores').select('name').eq('household_id', profile.household_id).order('name')
            .then(({ data }) => setHouseholdStores((data ?? []).map(s => s.name)))
          fetchItemTagSuggestions(profile.household_id).then(setTagSuggestions)

          const household = profile.households as unknown as { city: string | null; state: string | null; shopping_tier: number } | null
          setHouseholdCity(household?.city ?? null)
          setHouseholdState(household?.state ?? null)
          setShoppingTier(household?.shopping_tier ?? null)

          // Arrived with a name already resolved (barcode scan, typed +
          // tapped "Create," or a catalog match) — enrich automatically.
          // Picks up the prewarmed request from the shared cache if one
          // exists. Catalog items already arrive with known
          // category/unit/location/emoji via query params, and
          // applyEnrichment only fills those in when still at their default
          // value — so this still contributes canonical_name (and price)
          // for catalog items without overwriting what the catalog set.
          const initialName = searchParams.get('name')
          if (initialName?.trim()) {
            setEnriching(true)
            getOrFetchEnrichment({
              name: initialName,
              city: household?.city ?? null,
              state: household?.state ?? null,
              shoppingTier: household?.shopping_tier ?? null,
            }).then(result => {
              if (result) applyEnrichment(result)
              setEnriching(false)
            })
          }
        })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount only
  }, [])

  function handleAutofillTap() {
    if (!name.trim() || enriching) return
    setEnriching(true)
    refetchEnrichment({
      name: name.trim(),
      category,
      unit,
      location,
      city: householdCity,
      state: householdState,
      shoppingTier,
    }).then(result => {
      if (result) applyEnrichment(result)
      setEnriching(false)
    })
  }

  async function addNewStore(storeName: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !householdId) return
    await supabase.from('stores').insert({ household_id: householdId, name: storeName })
    setHouseholdStores(prev => [...prev, storeName].sort())
    setPreferredStores(prev => [...prev, storeName])
  }

  const isValid = name.trim() && category && location && unit && quantity >= 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !householdId || !userId) return
    setLoading(true)

    const supabase = createClient()
    const itemId = crypto.randomUUID()
    const trimmedName = name.trim()

    const savePromise = (async () => {
      // Enrichment (barcode/catalog/typed-then-create auto-trigger, or a
      // manual Autofill tap) usually already resolved this — but a freely
      // typed name that never went through either path would otherwise
      // save with no canonical_name, breaking recipe-ingredient matching
      // against this item indefinitely. Fill it in narrowly here (just the
      // canonical name, not category/unit/emoji/price) rather than running
      // full enrichment, which could silently override user-chosen fields.
      let resolvedCanonicalName = canonicalName
      if (!resolvedCanonicalName) {
        const [canonicalized] = await canonicalizeIngredients([trimmedName])
        resolvedCanonicalName = canonicalized?.canonicalName ?? null
      }

      const { error: itemError } = await supabase.from('items').insert({
        id: itemId,
        household_id: householdId,
        name: trimmedName,
        category,
        default_unit: unit,
        low_threshold: lowThreshold,
        emoji,
        tags,
        preferred_stores: preferredStores,
        auto_shopping_list: autoShoppingList,
        barcode: barcode || null,
        estimated_price: estimatedPrice,
        canonical_name: resolvedCanonicalName,
        catalog_id: catalogId || null,
        active: true,
      })
      if (itemError) throw new Error(itemError.message)

      const { error: invError } = await supabase.from('inventory').insert({
        household_id: householdId,
        item_id: itemId,
        location,
        quantity,
        unit,
        purchase_date: purchaseDate,
        added_by: userId,
      })
      if (invError) throw new Error(invError.message)

      if (shoppingListId) {
        await supabase.from('shopping_list')
          .update({ item_id: itemId, item_name: trimmedName })
          .eq('id', shoppingListId)
      }

      return itemId
    })()

    toast.promise(savePromise, {
      loading: `Adding ${trimmedName}…`,
      success: (id) => ({
        message: `${trimmedName} added!`,
        description: `${quantity} ${unit} added to ${location}`,
        action: { label: 'View item', onClick: () => router.push(`/inventory/${id}`) },
      }),
      error: (err) => err instanceof Error ? err.message : 'Something went wrong',
    })

    try {
      await savePromise
      // Return to wherever this form was opened from (Add search, Shopping
      // list, Inventory) rather than always landing on /add — same
      // history-with-fallback pattern PageHeader's back button uses.
      if (window.history.length <= 1) {
        router.push(shoppingListId ? '/shopping' : '/add')
      } else {
        router.back()
      }
    } catch {
      // already surfaced via toast.promise's error handler
    } finally {
      setLoading(false)
    }
  }

  // ── Layout helpers (same pattern as ItemDetail) ───────────

  const detailRow = (key: string, left: React.ReactNode, right: React.ReactNode) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
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

        {/* ── Name + AI autofill + emoji (same row as Inventory Detail identity) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Input
              type="text"
              required
              autoFocus
              placeholder="Item name"
              value={name}
              autoCapitalize="words"
              onChange={e => setName(toTitleCase(e.target.value))}
              className="font-extrabold text-lg"
              style={{ color: 'var(--foreground)', paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={handleAutofillTap}
              disabled={!name.trim() || enriching}
              aria-label="Autofill with AI"
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', padding: 0,
                cursor: !name.trim() || enriching ? 'default' : 'pointer',
                opacity: !name.trim() ? 0.3 : 1,
                color: 'var(--amber)',
              }}
            >
              <i
                className={enriching ? 'fi-sr-sparkles' : 'fi-rr-sparkles'}
                style={{
                  fontSize: 18, display: 'block', lineHeight: 1,
                  animation: enriching ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </button>
          </div>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>

        {/* ── Stock ── */}
        {sectionLabel('Stock')}

        {detailRow(
          'quantity',
          <Label>Quantity</Label>,
          <QuantityStepper value={quantity} onChange={setQuantity} min={0} />
        )}

        {detailRow(
          'unit',
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
          'location',
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
          'purchase-date',
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
          'auto-shopping-list',
          <Label>Auto add to shopping list</Label>,
          <Switch checked={autoShoppingList} onCheckedChange={v => setAutoShoppingList(v)} />
        )}

        {autoShoppingList && detailRow(
          'low-threshold',
          <Label>Auto add when below</Label>,
          <QuantityStepper value={lowThreshold} onChange={setLowThreshold} min={0} />
        )}

        {detailRow(
          'category',
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
          'preferred-stores',
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
          <TagInput tags={tags} onChange={setTags} suggestions={tagSuggestions} />
        </div>

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
