'use client'

import { useEffect, useState } from 'react'
import type { InventoryItem } from '@/lib/chefData'
import { fetchRecipeIdeas, matchPercent, type RecipeIdea } from '@/lib/recipeIdeas'

interface Props {
  inventory: InventoryItem[]
  defaultServings: number
  query?: string
}

const glassCard: React.CSSProperties = {
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.6)',
  background: 'var(--glass-card)',
  boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
}

export default function IdeasResults({ inventory, defaultServings, query }: Props) {
  const [suggestions, setSuggestions] = useState<RecipeIdea[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetchRecipeIdeas({ inventory, defaultServings, query })
      .then(data => {
        if (data) setSuggestions(data)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (inventory.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: (re)fetch whenever the query changes
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch only on query change, not inventory/defaultServings identity
  }, [query])

  function handleGetMore() {
    setLoadingMore(true)
    fetchRecipeIdeas({ inventory, defaultServings, query })
      .then(data => {
        if (data) setSuggestions(prev => (prev ? [...prev, ...data] : data))
      })
      .finally(() => setLoadingMore(false))
  }

  return (
    <div className="flex flex-col gap-4">
      {inventory.length === 0 && (
        <div className="rounded-14 px-4 py-8 flex flex-col items-center gap-2 text-center" style={{ background: 'var(--surface)' }}>
          <i className="fi-rr-sparkles" style={{ fontSize: 22, color: 'var(--amber)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Add a few items to your pantry and we&apos;ll suggest recipes to make.
          </p>
        </div>
      )}

      {inventory.length > 0 && loading && (
        <div className="rounded-14 px-4 py-8 flex flex-col items-center gap-2 text-center" style={{ background: 'var(--surface)' }}>
          <i className="fi-sr-sparkles" style={{ fontSize: 22, color: 'var(--amber)', animation: 'spin 1s linear infinite' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Finding recipes{query ? ` for "${query}"` : ''}…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-14 px-4 py-8 text-center" style={{ background: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Couldn&apos;t load recipe ideas right now — try again in a bit.</p>
        </div>
      )}

      {!loading && suggestions && suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          {suggestions.map((s, i) => {
            const pct = matchPercent(s.ingredients)
            return (
              <div key={i} className="rounded-14 p-4 flex flex-col gap-2" style={glassCard}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{s.recipe_name}</span>
                  <span
                    className="text-105 font-extrabold px-2 py-0.5 rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--teal) 20%, white)', color: 'var(--foreground)', flexShrink: 0 }}
                  >
                    {pct}% match
                  </span>
                </div>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{s.description}</span>
                <span className="text-105" style={{ color: 'var(--muted)' }}>Serves {s.servings}</span>

                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                    Ingredients
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {s.ingredients.map(ing => (
                      <span
                        key={ing.name}
                        className="text-105 font-semibold px-1.5 py-0.5 rounded-full"
                        style={ing.have_on_hand
                          ? { background: 'color-mix(in srgb, var(--yellow-light) 75%, transparent)', color: 'var(--foreground)' }
                          : { background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--foreground)' }}
                      >
                        {ing.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                    Instructions
                  </span>
                  <p className="text-105" style={{ color: 'var(--foreground)' }}>{s.instructions}</p>
                </div>
              </div>
            )
          })}

          <button
            type="button"
            onClick={handleGetMore}
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
    </div>
  )
}
