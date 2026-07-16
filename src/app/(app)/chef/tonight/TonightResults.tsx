'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChefPreferences, InventoryItem } from '@/lib/chefData'
import { getCachedTonightSuggestions, getOrFetchTonightSuggestions, refetchTonightSuggestions, type MealIdea } from '@/lib/mealIdeas'
import SuggestionDetailSheet from '@/components/chef/SuggestionDetailSheet'
import IngredientChipRow from '@/components/chef/IngredientChipRow'

interface Props {
  inventory: InventoryItem[]
  priorityItems: string[]
  defaultServings: number
  preferences: ChefPreferences
  strictOnly: boolean
  householdId: string
  userId: string
}

const glassCard: React.CSSProperties = {
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.6)',
  background: 'var(--glass-card)',
  boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
}

export default function TonightResults({ inventory, priorityItems, defaultServings, preferences, strictOnly, householdId, userId }: Props) {
  const [suggestions, setSuggestions] = useState<MealIdea[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<MealIdea | null>(null)
  // Tracks the `strictOnly` value we last actually fetched for — not just
  // whether this is the "first" effect run. A plain `isFirstLoad` boolean
  // ref breaks under React's dev-mode Strict Mode double-invoke: the ghost
  // second invocation sees the ref already flipped by the first, mistakes
  // itself for a real toggle change, and fires a second, unwanted fetch.
  const lastLoadedStrictOnly = useRef<boolean | null>(null)

  function loadSuggestions(shoppingMode: 'strict' | 'minor_extras', fresh: boolean, hasCached: boolean) {
    if (!hasCached) setLoading(true)
    setError(false)
    const params = { inventory, priorityItems, defaultServings, shoppingMode, preferences }
    const promise = fresh ? refetchTonightSuggestions(params) : getOrFetchTonightSuggestions(params)
    promise
      .then(data => {
        if (data) setSuggestions(data)
        else if (!hasCached) setError(true)
      })
      .catch(() => { if (!hasCached) setError(true) })
      .finally(() => setLoading(false))
  }

  function loadMoreSuggestions() {
    setLoadingMore(true)
    const shoppingMode = strictOnly ? 'strict' as const : 'minor_extras' as const
    const params = { inventory, priorityItems, defaultServings, shoppingMode, preferences }
    refetchTonightSuggestions(params)
      .then(data => {
        if (data) setSuggestions(prev => (prev ? [...prev, ...data] : data))
      })
      .finally(() => setLoadingMore(false))
  }

  useEffect(() => {
    if (inventory.length === 0) return

    // Strict Mode's synthetic re-invoke re-runs this effect with the same
    // `strictOnly` value — skip it rather than treating it as a real toggle.
    if (lastLoadedStrictOnly.current === strictOnly) return
    const wasFirstLoad = lastLoadedStrictOnly.current === null
    const fresh = !wasFirstLoad
    lastLoadedStrictOnly.current = strictOnly

    // On a page revisit (first mount of this instance), render the
    // last-resolved suggestions immediately instead of flashing the
    // loading state while the cache is re-read.
    const shoppingMode = strictOnly ? 'strict' as const : 'minor_extras' as const

    let hasCached = false
    if (wasFirstLoad) {
      const cached = getCachedTonightSuggestions(shoppingMode)
      if (cached) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: restore the last-resolved suggestions on mount
        setSuggestions(cached)
        hasCached = true
      }
    }

    loadSuggestions(shoppingMode, fresh, hasCached)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch only on toggle change, not on inventory/priorityItems/defaultServings identity
  }, [strictOnly])

  return (
    <div className="flex flex-col gap-4">
      {loading && (
        <div className="rounded-14 px-4 py-5 text-center" style={{ background: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Finding ideas…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-14 px-4 py-5 text-center" style={{ background: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Couldn&apos;t load suggestions right now — try again in a bit.</p>
        </div>
      )}

      {!loading && suggestions && suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => setSelectedSuggestion(s)}
              className="rounded-14 p-4 flex flex-col gap-2"
              style={{ ...glassCard, cursor: 'pointer' }}
            >
              <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{s.idea}</span>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>{s.description}</span>

              <div className="flex flex-col gap-1 mt-1">
                <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                  Uses
                </span>
                <IngredientChipRow ingredients={s.ingredients.filter(i => i.have_on_hand)} />
              </div>

              {s.ingredients.some(i => !i.have_on_hand && !i.is_staple) && (
                <div className="flex flex-col gap-1">
                  <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                    You&apos;d need
                  </span>
                  <IngredientChipRow ingredients={s.ingredients.filter(i => !i.have_on_hand)} variant="needed" />
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={loadMoreSuggestions}
            disabled={loadingMore}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '12px 16px', borderRadius: 12,
              border: '1.5px solid var(--divider)', background: 'var(--surface)',
              cursor: loadingMore ? 'default' : 'pointer', fontFamily: 'inherit',
              color: 'var(--foreground)', fontSize: 14, fontWeight: 600,
            }}
          >
            <i
              className={loadingMore ? 'fi-sr-sparkles' : 'fi-rr-sparkles'}
              style={{ fontSize: 15, display: 'block', lineHeight: 1, color: 'var(--amber)', animation: loadingMore ? 'spin 1s linear infinite' : 'none' }}
            />
            {loadingMore ? 'Finding more ideas…' : 'Get more ideas'}
          </button>
        </div>
      )}

      <SuggestionDetailSheet
        suggestion={selectedSuggestion}
        onOpenChange={open => !open && setSelectedSuggestion(null)}
        inventory={inventory}
        householdId={householdId}
        userId={userId}
      />
    </div>
  )
}
