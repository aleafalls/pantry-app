'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ChefPreferences, InventoryItem } from '@/lib/chefData'
import { fetchRecipeIdeas, getCachedRecipeIdeas, matchPercent, setCachedRecipeIdeas, type RecipeIdea } from '@/lib/recipeIdeas'
import { getRandomPrompts } from '@/lib/recipePrompts'
import AiLoadingCard from '@/components/chef/AiLoadingCard'
import RecipeIdeaSearchBox from '@/components/chef/RecipeIdeaSearchBox'
import RecipeIdeaDetailSheet from '@/components/chef/RecipeIdeaDetailSheet'

interface Props {
  inventory: InventoryItem[]
  defaultServings: number
  preferences: ChefPreferences
  query?: string
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

export default function IdeasResults({ inventory, defaultServings, preferences, query, householdId, userId }: Props) {
  const router = useRouter()
  const [inputValue, setInputValue] = useState(query ?? '')
  const [starterPrompts, setStarterPrompts] = useState<string[]>([])
  const [activeQuery, setActiveQuery] = useState(query)
  const [suggestions, setSuggestions] = useState<RecipeIdea[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<RecipeIdea | null>(null)
  // Guards the mount effect below against React's dev-mode double-invoke
  // (Strict Mode fires effects twice) — without this, the initial search
  // fires two requests, and whichever resolves last (success or error)
  // silently overwrites the other's state.
  const didLoadRef = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: randomize client-side only to avoid a server/client hydration mismatch
    setStarterPrompts(getRandomPrompts(5))
  }, [])

  function load(q: string) {
    setLoading(true)
    setError(false)
    setSuggestions(null)
    fetchRecipeIdeas({ inventory, defaultServings, query: q, preferences })
      .then(data => {
        if (data) {
          setSuggestions(data)
          setCachedRecipeIdeas(q, data)
        } else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true

    if (query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: (re)fetch whenever the query changes
      if (inventory.length > 0) load(query)
    } else {
      // No query in the URL — restore the last search from this session
      // (if any) instead of dropping back to the blank starter state.
      const cached = getCachedRecipeIdeas()
      if (cached) {
        setActiveQuery(cached.query)
        setSuggestions(cached.suggestions)
        setInputValue(cached.query)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount; this component remounts (see `key` in page.tsx) whenever the URL query changes
  }, [])

  function goToQuery(q: string) {
    const trimmed = q.trim()
    router.push(trimmed ? `/chef/ideas?q=${encodeURIComponent(trimmed)}` : '/chef/ideas')
  }

  function handleGetMore() {
    if (!activeQuery) return
    setLoadingMore(true)
    fetchRecipeIdeas({ inventory, defaultServings, query: activeQuery, preferences })
      .then(data => {
        if (data) {
          setSuggestions(prev => {
            const next = prev ? [...prev, ...data] : data
            setCachedRecipeIdeas(activeQuery, next)
            return next
          })
        }
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

      {inventory.length > 0 && (
        <>
          <RecipeIdeaSearchBox
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => goToQuery(inputValue)}
            instructionText={'Search for recipes with specific ingredients as inspo, a concept like "vegetarian pasta" or "instant pot meal", or tap a starting point below.'}
          />

          {!activeQuery && !loading && starterPrompts.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                Need inspiration?
              </span>
              <div className="flex flex-wrap gap-2">
                {starterPrompts.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => goToQuery(prompt)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '9px 18px', borderRadius: 99,
                      background: 'var(--glass-card)',
                      backdropFilter: 'blur(14px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(14px) saturate(180%)',
                      border: '1px solid oklch(100% 0 0 / 0.6)',
                      boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
                      fontSize: 14, fontWeight: 600, color: 'var(--foreground)',
                      whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {inventory.length > 0 && loading && (
        <AiLoadingCard label={`Finding recipes${activeQuery ? ` for "${activeQuery}"` : ''}…`} />
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
              <div
                key={i}
                onClick={() => setSelectedIdea(s)}
                className="rounded-14 p-4 flex flex-col gap-2"
                style={{ ...glassCard, cursor: 'pointer' }}
              >
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

                <div className="flex flex-wrap gap-1.5 mt-1">
                  {s.ingredients.slice(0, 5).map(ing => (
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
                  {s.ingredients.length > 5 && (
                    <span className="text-105" style={{ color: 'var(--muted)', alignSelf: 'center' }}>
                      +{s.ingredients.length - 5} more
                    </span>
                  )}
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

      <RecipeIdeaDetailSheet
        recipeIdea={selectedIdea}
        onOpenChange={open => !open && setSelectedIdea(null)}
        inventory={inventory}
        householdId={householdId}
        userId={userId}
      />
    </div>
  )
}
