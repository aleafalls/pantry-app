import type { InventoryItem } from './chefData'

export interface SuggestionIngredient {
  name: string
  emoji: string
  is_main: boolean
}

export interface Suggestion {
  idea: string
  description: string
  ingredients_used: SuggestionIngredient[]
  ingredients_needed: SuggestionIngredient[]
}

export interface TonightParams {
  inventory: InventoryItem[]
  priorityItems: string[]
  defaultServings: number
  allowShopping: boolean
}

// Module-level so it survives Next.js client-side navigation — a request
// fired from the Dashboard on session start can be picked up by the Chef
// tab or the Tonight page without duplicating the call.
const cache = new Map<string, Promise<Suggestion[] | null>>()

function cacheKey(allowShopping: boolean) {
  return allowShopping ? 'shopping' : 'strict'
}

async function requestSuggestions(params: TonightParams): Promise<Suggestion[] | null> {
  try {
    const res = await fetch('/api/ai/what-to-make-tonight', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        inventory: params.inventory,
        priority_items: params.priorityItems,
        allow_shopping: params.allowShopping,
        default_servings: params.defaultServings,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.suggestions ?? null
  } catch {
    return null
  }
}

/**
 * Fires the request and stores it in the shared cache without waiting —
 * call this as early in the session as possible (Dashboard mount) so the
 * Chef tab and Tonight page can read an already-resolved result instead
 * of starting fresh.
 */
export function prewarmTonightSuggestions(params: TonightParams) {
  if (params.inventory.length === 0) return
  const key = cacheKey(params.allowShopping)
  if (cache.has(key)) return
  cache.set(key, requestSuggestions(params))
}

/**
 * Returns the cached in-flight/completed request for this mode if one
 * exists (e.g. from prewarmTonightSuggestions), otherwise starts a fresh one.
 */
export function getOrFetchTonightSuggestions(params: TonightParams): Promise<Suggestion[] | null> {
  const key = cacheKey(params.allowShopping)
  const existing = cache.get(key)
  if (existing) return existing
  const promise = requestSuggestions(params)
  cache.set(key, promise)
  return promise
}

/**
 * Always fires a fresh request — used when the user explicitly asks for
 * new ideas (toggle change, "Get new ideas" button).
 */
export function refetchTonightSuggestions(params: TonightParams): Promise<Suggestion[] | null> {
  const key = cacheKey(params.allowShopping)
  const promise = requestSuggestions(params)
  cache.set(key, promise)
  return promise
}
