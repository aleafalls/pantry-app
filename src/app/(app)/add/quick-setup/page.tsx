'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Button } from '@/components/ui/button'
import ReceiptItemRow from '@/components/add/ReceiptItemRow'
import { ingredientIdentitySet, inventoryIdentityStrings } from '@/lib/recipeMatch'

interface QuickSetupRow {
  catalogId: string
  name: string
  emoji: string | null
  category: string
  unit: string
  location: string
  quantity: number
  matchedItemId: string | null
  existingInventoryRows: { id: string; location: string; quantity: number }[]
}

export default function QuickSetupPage() {
  const router = useRouter()
  const [rows, setRows] = useState<QuickSetupRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState(false)
  // React's `saving` state doesn't block a second click that fires before
  // the re-render commits the button's disabled attribute — a fast
  // double/triple-click on "Update My Pantry" could otherwise start
  // multiple concurrent save runs against the same stale snapshot of
  // existingInventoryRows, silently dropping all but one restock increment
  // and/or inserting duplicate new items. This ref is checked synchronously
  // at the very top of handleSave, so it closes that window.
  const savingRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single()
      const hhId = profile?.household_id ?? null
      if (!hhId) { router.replace('/onboarding'); return }
      setHouseholdId(hhId)

      const [{ data: catalogRows }, { data: existingItems }] = await Promise.all([
        supabase
          .from('catalog')
          .select('id, name, category, default_unit, default_location, emoji')
          .contains('tags', ['quick-setup'])
          .order('category')
          .order('name'),
        supabase
          .from('items')
          .select('id, catalog_id, name, canonical_name')
          .eq('household_id', hhId)
          .eq('active', true),
      ])

      // Households that already have one of these staple items should
      // restock the existing item instead of creating a duplicate — same
      // matched/unmatched split the receipt-review flow uses. Matching by
      // catalog_id alone misses items added by hand or via an older receipt
      // scan (both leave catalog_id null even for the same real-world
      // product), so fall back to the same name/canonical-name identity
      // matching the recipe-match code already uses for this exact problem.
      const itemIdByCatalogId = new Map<string, string>()
      const itemIdByIdentity = new Map<string, string>()
      for (const item of existingItems ?? []) {
        if (item.catalog_id) itemIdByCatalogId.set(item.catalog_id, item.id)
        for (const id of inventoryIdentityStrings({ name: item.name, canonicalName: item.canonical_name })) {
          if (!itemIdByIdentity.has(id)) itemIdByIdentity.set(id, item.id)
        }
      }

      function findMatchedItemId(catalogId: string, catalogName: string): string | null {
        const byId = itemIdByCatalogId.get(catalogId)
        if (byId) return byId
        for (const id of ingredientIdentitySet(catalogName)) {
          const match = itemIdByIdentity.get(id)
          if (match) return match
        }
        return null
      }

      const matchedItemIds = Array.from(new Set([
        ...itemIdByCatalogId.values(),
        ...(catalogRows ?? [])
          .map(c => findMatchedItemId(c.id, c.name))
          .filter((id): id is string => id != null),
      ]))

      const { data: inventoryRows } = matchedItemIds.length > 0
        ? await supabase
            .from('inventory')
            .select('id, item_id, location, quantity')
            .eq('household_id', hhId)
            .in('item_id', matchedItemIds)
        : { data: [] }

      const inventoryByItemId = new Map<string, { id: string; location: string; quantity: number }[]>()
      for (const inv of inventoryRows ?? []) {
        const list = inventoryByItemId.get(inv.item_id) ?? []
        list.push({ id: inv.id, location: inv.location, quantity: inv.quantity })
        inventoryByItemId.set(inv.item_id, list)
      }

      const built: QuickSetupRow[] = (catalogRows ?? []).map(c => {
        const matchedItemId = findMatchedItemId(c.id, c.name)
        return {
          catalogId: c.id,
          name: c.name,
          emoji: c.emoji,
          category: c.category,
          unit: c.default_unit,
          location: c.default_location,
          quantity: 0,
          matchedItemId,
          existingInventoryRows: matchedItemId ? (inventoryByItemId.get(matchedItemId) ?? []) : [],
        }
      })

      setRows(built)
      setLoaded(true)
    }

    load()
  }, [router])

  async function handleDismiss() {
    if (!householdId || dismissing) return
    setDismissing(true)

    const supabase = createClient()
    await supabase.from('household_preferences').upsert({
      household_id: householdId,
      dismissed_quick_setup: true,
      updated_at: new Date().toISOString(),
    })

    router.push('/')
  }

  function updateQuantity(catalogId: string, quantity: number) {
    setRows(prev => prev.map(r => r.catalogId === catalogId ? { ...r, quantity } : r))
  }

  const selected = rows.filter(r => r.quantity > 0)

  async function handleSave() {
    if (!householdId || !userId || selected.length === 0 || savingRef.current) return
    savingRef.current = true
    setSaving(true)

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const savePromise = (async () => {
      for (const row of selected) {
        if (row.matchedItemId) {
          // Same restock semantics as the Restock form / receipt review: bump
          // the highest-quantity existing location, else insert a new row at
          // the catalog's default location.
          const defaultRow = row.existingInventoryRows.length > 0
            ? row.existingInventoryRows.reduce((a, b) => a.quantity >= b.quantity ? a : b)
            : null

          if (defaultRow) {
            const { error } = await supabase.from('inventory').update({
              quantity: defaultRow.quantity + row.quantity,
              purchase_date: today,
              added_by: userId,
            }).eq('id', defaultRow.id)
            if (error) throw new Error(error.message)
          } else {
            const { error } = await supabase.from('inventory').insert({
              household_id: householdId,
              item_id: row.matchedItemId,
              location: row.location,
              quantity: row.quantity,
              unit: row.unit,
              purchase_date: today,
              added_by: userId,
            })
            if (error) throw new Error(error.message)
          }
        } else {
          // New items — same shape as the New Item form's insert.
          const itemId = crypto.randomUUID()
          const { error: itemError } = await supabase.from('items').insert({
            id: itemId,
            household_id: householdId,
            name: row.name,
            category: row.category,
            default_unit: row.unit,
            low_threshold: 2,
            emoji: row.emoji,
            tags: [],
            preferred_stores: [],
            auto_shopping_list: true,
            catalog_id: row.catalogId,
            active: true,
          })
          if (itemError) throw new Error(itemError.message)

          const { error: invError } = await supabase.from('inventory').insert({
            household_id: householdId,
            item_id: itemId,
            location: row.location,
            quantity: row.quantity,
            unit: row.unit,
            purchase_date: today,
            added_by: userId,
          })
          if (invError) throw new Error(invError.message)
        }
      }

      return { count: selected.length }
    })()

    toast.promise(savePromise, {
      loading: 'Updating your pantry…',
      success: ({ count }) => `Added ${count} item${count === 1 ? '' : 's'} to your pantry`,
      error: (err) => err instanceof Error ? err.message : 'Something went wrong',
    })

    try {
      await savePromise
      router.push('/')
    } catch {
      // already surfaced via toast.promise's error handler
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  // Group by category, preserving the query's category/name ordering.
  const categories: string[] = []
  const rowsByCategory = new Map<string, QuickSetupRow[]>()
  for (const row of rows) {
    if (!rowsByCategory.has(row.category)) {
      categories.push(row.category)
      rowsByCategory.set(row.category, [])
    }
    rowsByCategory.get(row.category)!.push(row)
  }

  return (
    <AppBackground>
      <PageHeader
        title="Quick Pantry Setup"
        backHref="/"
        rightAction={
          <button
            type="button"
            onClick={handleDismiss}
            disabled={!householdId || dismissing}
            aria-label="Dismiss Quick Pantry Setup"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--muted)', lineHeight: 1, display: 'block',
              opacity: !householdId || dismissing ? 0.4 : 1,
            }}
          >
            <i className="fi-rr-cross-small" style={{ fontSize: 18, display: 'block' }} />
          </button>
        }
      />

      {!loaded ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
        </div>
      ) : (
        <>
          <div style={{ padding: '4px 20px 0' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Set how many of each you already have, then update your pantry all at once.
            </p>
          </div>

          {categories.map(category => (
            <div key={category}>
              <div style={{ padding: '12px 20px 4px' }}>
                <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                  {category}
                </span>
              </div>
              {rowsByCategory.get(category)!.map(row => (
                <ReceiptItemRow
                  key={row.catalogId}
                  emoji={row.emoji}
                  name={row.name}
                  price={null}
                  quantity={row.quantity}
                  unit={row.unit}
                  onQuantityChange={qty => updateQuantity(row.catalogId, qty)}
                />
              ))}
            </div>
          ))}

          <div style={{ padding: '20px' }}>
            <Button
              type="button"
              variant="brand"
              disabled={saving || selected.length === 0}
              onClick={handleSave}
              style={{
                width: '100%',
                background: 'linear-gradient(150deg, var(--teal-light), var(--teal))',
                color: '#FFFFFF',
                padding: '14px 16px',
              }}
            >
              {saving ? 'Updating…' : selected.length > 0 ? `Update My Pantry (${selected.length})` : 'Update My Pantry'}
            </Button>
          </div>
        </>
      )}
    </AppBackground>
  )
}
