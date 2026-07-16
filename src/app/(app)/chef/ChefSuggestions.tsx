'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ChefPreferences, InventoryItem } from '@/lib/chefData'
import { getCachedTonightSuggestions, getOrFetchTonightSuggestions, type MealIdea } from '@/lib/mealIdeas'
import SuggestionDetailSheet from '@/components/chef/SuggestionDetailSheet'
import AiLoadingCard from '@/components/chef/AiLoadingCard'
import IngredientChipRow from '@/components/chef/IngredientChipRow'

interface Props {
  inventory: InventoryItem[]
  priorityItems: string[]
  defaultServings: number
  preferences: ChefPreferences
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

export default function ChefSuggestions({ inventory, priorityItems, defaultServings, preferences, householdId, userId }: Props) {
  const [suggestions, setSuggestions] = useState<MealIdea[] | null>(null)
  const [error, setError] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<MealIdea | null>(null)

  useEffect(() => {
    if (inventory.length === 0) return

    // Render the last-resolved result immediately, if any, so revisiting
    // this tab doesn't flash the loading state while the cache is re-read.
    const cached = getCachedTonightSuggestions('strict')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: restore the last-resolved suggestions on mount
    if (cached) setSuggestions(cached)

    let cancelled = false
    getOrFetchTonightSuggestions({ inventory, priorityItems, defaultServings, shoppingMode: 'strict', preferences })
      .then(data => {
        if (cancelled) return
        if (data) setSuggestions(data)
        else if (!cached) setError(true)
      })
      .catch(() => { if (!cancelled && !cached) setError(true) })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; inventory/priorityItems/defaultServings come from the server-rendered page and don't change during this component's lifetime
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-135 font-extrabold uppercase tracking-003" style={{ color: 'var(--foreground)' }}>
          What to make tonight
        </span>
        <Link href="/chef/tonight" className="text-xs font-bold" style={{ color: 'var(--amber)', textDecoration: 'none' }}>
          View more
        </Link>
      </div>

      {inventory.length === 0 && (
        <div className="rounded-14 px-4 py-5 text-center" style={{ background: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Add a few items to your pantry and we&apos;ll suggest what to make.
          </p>
        </div>
      )}

      {inventory.length > 0 && !suggestions && !error && (
        <AiLoadingCard label="Finding ideas from what you have…" />
      )}

      {error && (
        <div className="rounded-14 px-4 py-5 text-center" style={{ background: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Couldn&apos;t load suggestions right now — try again in a bit.</p>
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          {suggestions.slice(0, 2).map((s, i) => (
            <div
              key={i}
              onClick={() => setSelectedSuggestion(s)}
              className="flex items-center gap-3 rounded-14 p-3"
              style={{ ...glassCard, cursor: 'pointer' }}
            >
              <div className="flex flex-col gap-1.5" style={{ flex: 1, minWidth: 0 }}>
                <span className="text-13 font-bold" style={{ color: 'var(--foreground)' }}>{s.idea}</span>
                <IngredientChipRow ingredients={s.ingredients.filter(i => i.have_on_hand)} />
              </div>
              <i className="fi-rr-angle-right" style={{ fontSize: 14, display: 'block', flexShrink: 0, color: 'var(--muted)' }} />
            </div>
          ))}
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
