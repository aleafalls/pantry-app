'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { InventoryItem } from '@/lib/chefData'
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
  const [updating, setUpdating] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)

  const dirty = Object.keys(baselineQty).some(name => pendingQty[name] !== baselineQty[name])

  async function handleAddToList(name: string, itemId: string | null) {
    const supabase = createClient()
    if (itemId) {
      const { count } = await supabase.from('shopping_list')
        .select('id', { count: 'exact', head: true })
        .eq('item_id', itemId).eq('status', 'pending')
      if (!count) {
        await supabase.from('shopping_list').insert({
          household_id: householdId,
          item_id: itemId,
          item_name: name,
          reason: 'recipe',
          status: 'pending',
          added_by: userId,
        })
      }
    } else {
      await supabase.from('shopping_list').insert({
        household_id: householdId,
        item_id: null,
        item_name: name,
        reason: 'recipe',
        status: 'pending',
        added_by: userId,
      })
    }
    setAddedToList(prev => new Set(prev).add(name))
    setTimeout(() => {
      setAddedToList(prev => {
        const next = new Set(prev)
        next.delete(name)
        return next
      })
    }, 2000)
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
          Stock
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
        {ingredients.map(ing => {
          const match = matches.get(ing.name)
          const onHand = !!match && match.total > 0
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

              {onHand ? (
                <CompactStepper
                  value={pendingQty[ing.name]}
                  unit={match!.unit}
                  changed={pendingQty[ing.name] !== baselineQty[ing.name]}
                  onChange={v => setPendingQty(prev => ({ ...prev, [ing.name]: v }))}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddToList(ing.name, match?.itemId ?? null)}
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    border: '1px solid var(--divider)', background: 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    color: addedToList.has(ing.name) ? 'var(--teal)' : 'var(--foreground)',
                  }}
                >
                  <i
                    className={addedToList.has(ing.name) ? 'fi-sr-check' : 'fi-rr-shopping-cart'}
                    style={{ fontSize: 14, display: 'block', lineHeight: 1 }}
                  />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompactStepper({ value, unit, changed, onChange }: { value: number; unit: string; changed: boolean; onChange: (value: number) => void }) {
  const fill = changed ? 'color-mix(in srgb, var(--yellow-light) 55%, lab(99 0.1 1.08))' : 'lab(99 0.1 1.08)'
  const border = changed ? '1px solid var(--yellow)' : '1px solid oklch(100% 0 0 / 0.5)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, width: 104 }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{
          width: 26, height: 26, borderRadius: '8px 0 0 8px',
          border, borderRight: 'none',
          background: fill, color: 'var(--foreground)',
          fontSize: 15, fontWeight: 600, cursor: value <= 0 ? 'not-allowed' : 'pointer',
          opacity: value <= 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <div style={{
        flex: 1, height: 26, padding: '0 4px', overflow: 'hidden',
        borderTop: border, borderBottom: border,
        background: fill, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap',
      }}>
        {value}{unit ? ` ${unit}` : ''}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={{
          width: 26, height: 26, borderRadius: '0 8px 8px 0',
          border, borderLeft: 'none',
          background: fill, color: 'var(--foreground)',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className="fi-rr-plus" style={{ fontSize: 11, display: 'block', lineHeight: 1 }} />
      </button>
    </div>
  )
}
