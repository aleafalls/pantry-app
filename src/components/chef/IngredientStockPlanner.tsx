'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { InventoryItem } from '@/lib/chefData'
import { parseLeadingQuantity } from '@/lib/quantity'
import { ingredientIdentitySet, inventoryIdentityStrings } from '@/lib/recipeMatch'
import CompactStepper from './CompactStepper'

export interface PlannerIngredient {
  name: string
  quantity: string | null
  unit: string | null
  canonical_name?: string | null
}

interface Props {
  ingredients: PlannerIngredient[]
  inventory: InventoryItem[]
  householdId: string
  userId: string
}

interface IngredientMatch {
  rows: InventoryItem[]
  total: number
  unit: string
  itemId: string
}

// A recipe can legitimately call for the same ingredient more than once
// (e.g. olive oil for sautéing and again for a dressing). Every piece of
// state below (matches, quantities, key props) is keyed by ing.name, so
// duplicate names must be merged into one row before anything else touches
// them — otherwise two entries silently share one stepper's state instead
// of each tracking its own quantity.
function mergeDuplicateIngredients(ingredients: PlannerIngredient[]): PlannerIngredient[] {
  const order: string[] = []
  const merged = new Map<string, { ing: PlannerIngredient; parts: string[] }>()

  for (const ing of ingredients) {
    const key = ing.name.trim().toLowerCase()
    const part = [ing.quantity, ing.unit].filter(Boolean).join(' ').trim()
    const existing = merged.get(key)
    if (existing) {
      if (part) existing.parts.push(part)
    } else {
      order.push(key)
      merged.set(key, { ing, parts: part ? [part] : [] })
    }
  }

  return order.map(key => {
    const { ing, parts } = merged.get(key)!
    return { ...ing, quantity: parts.length > 0 ? parts.join(' + ') : null, unit: null }
  })
}

// Identity-set matching (canonical/raw names, "X or Y" alternatives, the
// derived-form allowlist) lives in recipeMatch.ts and is shared with the
// card-level match-percent calculation — the two used to be separate,
// independently-maintained copies that silently drifted out of sync.
function matchIngredient(ing: PlannerIngredient, inventory: InventoryItem[]): IngredientMatch | null {
  const ingIds = ingredientIdentitySet(ing.name, ing.canonical_name)
  const rows = inventory.filter(inv => inventoryIdentityStrings(inv).some(id => ingIds.has(id)))
  if (rows.length === 0) return null
  const total = rows.reduce((sum, r) => sum + r.quantity, 0)
  const primary = rows.reduce((a, b) => (b.quantity >= a.quantity ? b : a))
  return { rows, total, unit: primary.unit, itemId: primary.itemId }
}

// Spreads a new total across the rows an ingredient matched to, instead of
// dumping the whole delta on one row. Increases go to the largest row;
// decreases drain from the largest row down so no row goes negative and no
// quantity gets silently dropped.
function distributeStockUpdate(rows: InventoryItem[], newTotal: number): Array<{ id: string; quantity: number }> {
  const sorted = [...rows].sort((a, b) => b.quantity - a.quantity)
  const currentTotal = sorted.reduce((sum, r) => sum + r.quantity, 0)
  const updates: Array<{ id: string; quantity: number }> = []

  if (newTotal >= currentTotal) {
    const delta = newTotal - currentTotal
    if (delta > 0) updates.push({ id: sorted[0].id, quantity: sorted[0].quantity + delta })
    return updates
  }

  let remaining = currentTotal - newTotal
  for (const row of sorted) {
    if (remaining <= 0) break
    const take = Math.min(row.quantity, remaining)
    if (take > 0) {
      updates.push({ id: row.id, quantity: row.quantity - take })
      remaining -= take
    }
  }
  return updates
}

export default function IngredientStockPlanner({ ingredients: rawIngredients, inventory, householdId, userId }: Props) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ingredients is stable per page load
  const ingredients = useMemo(() => mergeDuplicateIngredients(rawIngredients), [])

  const matches = useMemo(() => {
    const map = new Map<string, IngredientMatch | null>()
    for (const ing of ingredients) map.set(ing.name, matchIngredient(ing, inventory))
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ingredients/inventory are stable per page load
  }, [])

  const [baselineQty, setBaselineQty] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    matches.forEach((match, name) => {
      if (match && match.total > 0) initial[name] = match.total
    })
    return initial
  })
  const [pendingQty, setPendingQty] = useState<Record<string, number>>(() => ({ ...baselineQty }))
  const [addedToList, setAddedToList] = useState<Set<string>>(new Set())
  const [addingAll, setAddingAll] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)

  const dirty = Object.keys(baselineQty).some(name => pendingQty[name] !== baselineQty[name])

  const onHandIngredients = ingredients.filter(ing => {
    const match = matches.get(ing.name)
    return !!match && match.total > 0
  })
  const neededIngredients = ingredients.filter(ing => {
    const match = matches.get(ing.name)
    return !match || match.total <= 0
  })

  // Reflect anything already on the shopping list (from a previous visit,
  // or added via another flow) so the cart icon starts checked, not just
  // right after clicking it in this session.
  useEffect(() => {
    const supabase = createClient()
    supabase.from('shopping_list')
      .select('item_id, item_name')
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .then(({ data }) => {
        if (!data) return
        const pendingItemIds = new Set(data.map(r => r.item_id).filter(Boolean))
        const pendingNames = new Set(data.map(r => r.item_name.trim().toLowerCase()))
        setAddedToList(prev => {
          const next = new Set(prev)
          for (const ing of ingredients) {
            const match = matches.get(ing.name)
            const alreadyPending = (match?.itemId && pendingItemIds.has(match.itemId))
              || pendingNames.has(ing.name.trim().toLowerCase())
            if (alreadyPending) next.add(ing.name)
          }
          return next
        })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  async function handleAddToList(ing: PlannerIngredient) {
    if (addedToList.has(ing.name)) return
    const itemId = matches.get(ing.name)?.itemId ?? null
    const quantity = parseLeadingQuantity(ing.quantity) ?? undefined
    const unit = ing.unit ?? undefined
    const supabase = createClient()

    try {
      if (itemId) {
        const { count } = await supabase.from('shopping_list')
          .select('id', { count: 'exact', head: true })
          .eq('item_id', itemId).eq('status', 'pending')
        if (!count) {
          const { error } = await supabase.from('shopping_list').insert({
            household_id: householdId,
            item_id: itemId,
            item_name: ing.name,
            reason: 'recipe',
            status: 'pending',
            added_by: userId,
            quantity,
            unit,
          })
          if (error) throw error
        }
      } else {
        const { error } = await supabase.from('shopping_list').insert({
          household_id: householdId,
          item_id: null,
          item_name: ing.name,
          reason: 'recipe',
          status: 'pending',
          added_by: userId,
          quantity,
          unit,
        })
        if (error) throw error
      }
      setAddedToList(prev => new Set(prev).add(ing.name))
    } catch {
      toast.error(`Couldn't add ${ing.name} to the list — try again.`)
    }
  }

  async function handleAddAllToList() {
    setAddingAll(true)
    try {
      await Promise.all(
        neededIngredients
          .filter(ing => !addedToList.has(ing.name))
          .map(ing => handleAddToList(ing))
      )
    } finally {
      setAddingAll(false)
    }
  }

  async function handleUpdateStock() {
    setUpdating(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    let hadError = false

    try {
      await Promise.all(Object.keys(baselineQty).map(async name => {
        const match = matches.get(name)
        const newQty = pendingQty[name]
        if (!match || newQty === baselineQty[name]) return
        const isIncrease = newQty > match.total

        const rowUpdates = distributeStockUpdate(match.rows, newQty)
        const results = await Promise.all(rowUpdates.map(({ id, quantity }) =>
          supabase.from('inventory').update({
            quantity,
            added_by: userId,
            ...(isIncrease ? { purchase_date: today } : {}),
          }).eq('id', id)
        ))
        if (results.some(r => r.error)) hadError = true
      }))
    } catch {
      hadError = true
    }

    setUpdating(false)
    if (hadError) {
      toast.error("Couldn't update stock — try again.")
      return
    }
    setBaselineQty({ ...pendingQty })
    setJustUpdated(true)
    setTimeout(() => setJustUpdated(false), 2000)
  }

  const allNeededAdded = neededIngredients.length > 0 && neededIngredients.every(ing => addedToList.has(ing.name))

  return (
    <div className="flex flex-col gap-6">
      {onHandIngredients.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
              In Stock
            </span>
            {dirty && (
              <button
                type="button"
                onClick={handleUpdateStock}
                disabled={updating}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 99, border: 'none',
                  background: justUpdated ? 'var(--surface)' : 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
                  color: justUpdated ? 'var(--foreground)' : '#4A3300',
                  fontSize: 12, fontWeight: 700, cursor: updating ? 'default' : 'pointer',
                }}
              >
                {updating ? 'Saving…' : justUpdated ? 'Updated!' : 'Update stock'}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {onHandIngredients.map(ing => {
              const match = matches.get(ing.name)!
              return (
                <div key={ing.name} className="flex items-center justify-between gap-3">
                  <div style={{ minWidth: 0 }}>
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)', display: 'block' }}>
                      {ing.name}
                    </span>
                    {(ing.quantity || ing.unit) && (
                      <span className="text-105" style={{ color: 'var(--muted)' }}>
                        Recipe calls for {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </div>

                  <CompactStepper
                    value={pendingQty[ing.name]}
                    baseline={baselineQty[ing.name]}
                    unit={match.unit}
                    onChange={v => setPendingQty(prev => ({ ...prev, [ing.name]: v }))}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {neededIngredients.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
              Needed
            </span>
            {!allNeededAdded && (
              <button
                type="button"
                onClick={handleAddAllToList}
                disabled={addingAll}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 99, border: 'none',
                  background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
                  color: '#4A3300',
                  fontSize: 12, fontWeight: 700, cursor: addingAll ? 'default' : 'pointer',
                }}
              >
                {addingAll ? 'Adding…' : 'Add all to list'}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {neededIngredients.map(ing => {
              const added = addedToList.has(ing.name)
              return (
                <div key={ing.name} className="flex items-center justify-between gap-3">
                  <div style={{ minWidth: 0 }}>
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)', display: 'block' }}>
                      {ing.name}
                    </span>
                    {(ing.quantity || ing.unit) && (
                      <span className="text-105" style={{ color: 'var(--muted)' }}>
                        Recipe calls for {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToList(ing)}
                    style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      border: '1px solid var(--divider)', background: 'var(--surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: added ? 'default' : 'pointer',
                      color: added ? 'var(--teal)' : 'var(--foreground)',
                    }}
                  >
                    <i
                      className={added ? 'fi-sr-check' : 'fi-rr-shopping-cart'}
                      style={{ fontSize: 14, display: 'block', lineHeight: 1 }}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
