'use client'

import { useEffect, useRef, useState } from 'react'
import type { InventoryItem } from '@/lib/chefData'
import { getCachedTonightSuggestions, getOrFetchTonightSuggestions, refetchTonightSuggestions, type Suggestion } from '@/lib/chefSuggestions'
import { getIngredientChipColors } from '@/lib/chipColors'
import SuggestionDetailSheet from '@/components/chef/SuggestionDetailSheet'

interface Props {
  inventory: InventoryItem[]
  priorityItems: string[]
  defaultServings: number
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

export default function TonightResults({ inventory, priorityItems, defaultServings, strictOnly, householdId, userId }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const isFirstLoad = useRef(true)

  function loadSuggestions(allowShoppingValue: boolean, fresh: boolean, hasCached: boolean) {
    if (!hasCached) setLoading(true)
    setError(false)
    const params = { inventory, priorityItems, defaultServings, allowShopping: allowShoppingValue }
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
    const params = { inventory, priorityItems, defaultServings, allowShopping: !strictOnly }
    refetchTonightSuggestions(params)
      .then(data => {
        if (data) setSuggestions(prev => (prev ? [...prev, ...data] : data))
      })
      .finally(() => setLoadingMore(false))
  }

  useEffect(() => {
    if (inventory.length === 0) return
    // First mount reads the Dashboard's prewarmed result (if any); every
    // later run of this effect is a toggle change, so it forces a fresh call.
    const wasFirstLoad = isFirstLoad.current
    const fresh = !wasFirstLoad
    isFirstLoad.current = false

    // On a page revisit (first mount of this instance), render the
    // last-resolved suggestions immediately instead of flashing the
    // loading state while the cache is re-read.
    let hasCached = false
    if (wasFirstLoad) {
      const cached = getCachedTonightSuggestions(!strictOnly)
      if (cached) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: restore the last-resolved suggestions on mount
        setSuggestions(cached)
        hasCached = true
      }
    }

    loadSuggestions(!strictOnly, fresh, hasCached)
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
          {suggestions.map((s, i) => {
            const chipColors = getIngredientChipColors(s.ingredients_used)
            return (
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
                  <div className="flex flex-wrap gap-1.5">
                    {s.ingredients_used.map((ing, ii) => (
                      <span key={ing.name} className="text-105 font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: chipColors[ii].bg, color: chipColors[ii].text }}>
                        {ing.emoji} {ing.name}
                      </span>
                    ))}
                  </div>
                </div>

                {s.ingredients_needed.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                      You&apos;d need
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {s.ingredients_needed.map(ing => (
                        <span key={ing.name} className="text-105 font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--foreground)' }}>
                          {ing.emoji} {ing.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

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
