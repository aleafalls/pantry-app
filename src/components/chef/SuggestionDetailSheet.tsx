'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import type { InventoryItem } from '@/lib/chefData'
import type { MealIdea, MealIdeaIngredient } from '@/lib/mealIdeas'
import { findAndImportRecipe } from '@/lib/findRecipe'
import CompactStepper from './CompactStepper'

interface Props {
  suggestion: MealIdea | null
  onOpenChange: (open: boolean) => void
  inventory: InventoryItem[]
  householdId: string
  userId: string
}

export default function SuggestionDetailSheet({ suggestion, onOpenChange, inventory, householdId, userId }: Props) {
  return (
    <Sheet open={!!suggestion} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-6 pt-6 pb-8 flex flex-col gap-5"
        style={{ background: 'oklch(97% 0.006 85)', border: 'none', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {suggestion && (
          <SuggestionDetailBody
            key={suggestion.idea}
            suggestion={suggestion}
            inventory={inventory}
            householdId={householdId}
            userId={userId}
          />
        )}
      </SheetContent>
    </Sheet>
  )
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

function dedupeIngredients(ingredients: MealIdeaIngredient[]): MealIdeaIngredient[] {
  const seen = new Set<string>()
  return ingredients.filter(ing => {
    const key = ing.name.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

interface BodyProps {
  suggestion: MealIdea
  inventory: InventoryItem[]
  householdId: string
  userId: string
}

function SuggestionDetailBody({ suggestion, inventory, householdId, userId }: BodyProps) {
  const router = useRouter()
  const [findingRecipe, setFindingRecipe] = useState<'searching' | 'reading' | null>(null)
  const [findError, setFindError] = useState<string | null>(null)

  const allIngredients = useMemo(
    () => dedupeIngredients(suggestion.ingredients),
    [suggestion]
  )

  const matches = useMemo(() => {
    const map = new Map<string, IngredientMatch | null>()
    for (const ing of allIngredients) map.set(ing.name, matchIngredient(ing.name, inventory))
    return map
  }, [allIngredients, inventory])

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

  async function handleFindRecipe() {
    setFindError(null)
    const keyIngredients = suggestion.ingredients.filter(i => !i.is_staple).map(i => i.name).slice(0, 4)
    const outcome = await findAndImportRecipe(suggestion.idea, keyIngredients, stage => setFindingRecipe(stage))
    setFindingRecipe(null)
    if (outcome.status === 'success') {
      router.push('/chef/new')
    } else if (outcome.status === 'not_found') {
      setFindError("Couldn't find a good match for this online — try tweaking the idea and searching below.")
    } else if (outcome.status === 'import_failed') {
      setFindError(outcome.message)
    } else {
      setFindError('Something went wrong — try again.')
    }
  }

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
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>{suggestion.idea}</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{suggestion.description}</p>
      </div>

      <button
        type="button"
        onClick={handleFindRecipe}
        disabled={!!findingRecipe}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 16px', borderRadius: 14, border: 'none',
          background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
          color: '#4A3300', fontSize: 15, fontWeight: 700,
          cursor: findingRecipe ? 'default' : 'pointer', fontFamily: 'inherit',
        }}
      >
        {findingRecipe && (
          <i className="fi-rr-rotate-right" style={{ fontSize: 14, display: 'block', lineHeight: 1, animation: 'spin 1s linear infinite' }} />
        )}
        {findingRecipe === 'searching' && 'Finding a recipe…'}
        {findingRecipe === 'reading' && 'Reading the recipe…'}
        {!findingRecipe && 'Find a Full Recipe'}
      </button>
      {findError && (
        <p className="text-sm" style={{ color: 'var(--red)', margin: 0 }}>{findError}</p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
            Ingredients you have on hand
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
          {allIngredients.map(ing => {
            const match = matches.get(ing.name)
            const onHand = !!match && match.total > 0
            return (
              <div key={ing.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{ing.emoji}</span>
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{ing.name}</span>
                </div>

                {onHand ? (
                  <CompactStepper
                    value={pendingQty[ing.name]}
                    baseline={baselineQty[ing.name]}
                    unit={match!.unit}
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
    </div>
  )
}
