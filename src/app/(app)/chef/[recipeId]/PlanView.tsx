'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { InventoryItem } from '@/lib/chefData'
import { parseLeadingQuantity } from '@/lib/quantity'
import CompactStepper from '@/components/chef/CompactStepper'
import type { RecipeIngredientData } from './RecipeTabs'

interface Props {
  ingredients: RecipeIngredientData[]
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

function matchIngredient(name: string, inventory: InventoryItem[]): IngredientMatch | null {
  const norm = name.trim().toLowerCase()
  const rows = inventory.filter(inv => inv.name.trim().toLowerCase() === norm)
  if (rows.length === 0) return null
  const total = rows.reduce((sum, r) => sum + r.quantity, 0)
  const primary = rows.reduce((a, b) => (b.quantity >= a.quantity ? b : a))
  return { rows, total, unit: primary.unit, itemId: primary.itemId }
}

export default function PlanView({ ingredients, inventory, householdId, userId }: Props) {
  const matches = useMemo(() => {
    const map = new Map<string, IngredientMatch | null>()
    for (const ing of ingredients) map.set(ing.name, matchIngredient(ing.name, inventory))
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

  async function handleAddToList(ing: RecipeIngredientData) {
    if (addedToList.has(ing.name)) return
    const itemId = matches.get(ing.name)?.itemId ?? null
    const quantity = parseLeadingQuantity(ing.quantity) ?? undefined
    const unit = ing.unit ?? undefined
    const supabase = createClient()

    if (itemId) {
      const { count } = await supabase.from('shopping_list')
        .select('id', { count: 'exact', head: true })
        .eq('item_id', itemId).eq('status', 'pending')
      if (!count) {
        await supabase.from('shopping_list').insert({
          household_id: householdId,
          item_id: itemId,
          item_name: ing.name,
          reason: 'recipe',
          status: 'pending',
          added_by: userId,
          quantity,
          unit,
        })
      }
    } else {
      await supabase.from('shopping_list').insert({
        household_id: householdId,
        item_id: null,
        item_name: ing.name,
        reason: 'recipe',
        status: 'pending',
        added_by: userId,
        quantity,
        unit,
      })
    }
    setAddedToList(prev => new Set(prev).add(ing.name))
  }

  async function handleAddAllToList() {
    setAddingAll(true)
    await Promise.all(
      neededIngredients
        .filter(ing => !addedToList.has(ing.name))
        .map(ing => handleAddToList(ing))
    )
    setAddingAll(false)
  }

  async function handleUpdateStock() {
    setUpdating(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    await Promise.all(Object.keys(baselineQty).map(async name => {
      const match = matches.get(name)
      const newQty = pendingQty[name]
      if (!match || newQty === baselineQty[name]) return
      const isIncrease = newQty > match.total

      if (match.rows.length === 1) {
        await supabase.from('inventory').update({
          quantity: newQty,
          added_by: userId,
          ...(isIncrease ? { purchase_date: today } : {}),
        }).eq('id', match.rows[0].id)
      } else {
        const primary = match.rows.reduce((a, b) => (b.quantity >= a.quantity ? b : a))
        const delta = newQty - match.total
        const adjusted = Math.max(0, primary.quantity + delta)
        await supabase.from('inventory').update({
          quantity: adjusted,
          added_by: userId,
          ...(isIncrease ? { purchase_date: today } : {}),
        }).eq('id', primary.id)
      }
    }))

    setBaselineQty({ ...pendingQty })
    setUpdating(false)
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
                <div key={ing.id} className="flex items-center justify-between gap-3">
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
                <div key={ing.id} className="flex items-center justify-between gap-3">
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
