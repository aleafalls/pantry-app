import type { ChefPreferences, InventoryItem } from './chefData'

export interface MealIdeaIngredient {
  name: string
  emoji: string
  is_main: boolean
  is_staple: boolean
  have_on_hand: boolean
}

export interface MealIdea {
  idea: string
  description: string
  ingredients: MealIdeaIngredient[]
}

export type ShoppingMode = 'strict' | 'minor_extras' | 'unconstrained'

interface RequestParams {
  inventory: InventoryItem[]
  defaultServings: number
  shoppingMode: ShoppingMode
  weightPriorityItems: boolean
  priorityItems?: string[]
  query?: string
  anchorIngredient?: string
  preferences?: ChefPreferences
}

async function requestMealIdeas(params: RequestParams): Promise<MealIdea[] | null> {
  try {
    const res = await fetch('/api/ai/meal-ideas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        inventory: params.inventory,
        shopping_mode: params.shoppingMode,
        weight_priority_items: params.weightPriorityItems,
        priority_items: params.weightPriorityItems ? (params.priorityItems ?? []) : undefined,
        query: params.query,
        anchor_ingredient: params.anchorIngredient,
        default_servings: params.defaultServings,
        household_preferences: params.preferences && {
          dietary_restrictions: params.preferences.dietaryRestrictions,
          favorite_cuisines: params.preferences.favoriteCuisines,
          macro_goals: params.preferences.macroGoals,
        },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.suggestions ?? null
  } catch {
    return null
  }
}

export function matchPercent(ingredients: MealIdeaIngredient[]): number {
  if (ingredients.length === 0) return 0
  const have = ingredients.filter(i => i.have_on_hand).length
  return Math.round((have / ingredients.length) * 100)
}

// ── What to Make Tonight ────────────────────────────────────────────
// Strict/minor-extras modes only, always weighted toward using up older or
// high-quantity items. Cached at module level (survives client-side
// navigation) so a request fired from the Dashboard on session start can be
// picked up by the Chef tab or the Tonight page without duplicating the call.

export interface TonightParams {
  inventory: InventoryItem[]
  priorityItems: string[]
  defaultServings: number
  shoppingMode: 'strict' | 'minor_extras'
  preferences?: ChefPreferences
}

const tonightCache = new Map<string, Promise<MealIdea[] | null>>()
const tonightResolvedCache = new Map<string, MealIdea[]>()

async function requestTonightSuggestions(params: TonightParams): Promise<MealIdea[] | null> {
  const suggestions = await requestMealIdeas({
    inventory: params.inventory,
    defaultServings: params.defaultServings,
    shoppingMode: params.shoppingMode,
    weightPriorityItems: true,
    priorityItems: params.priorityItems,
    preferences: params.preferences,
  })
  if (suggestions) tonightResolvedCache.set(params.shoppingMode, suggestions)
  return suggestions
}

export function getCachedTonightSuggestions(shoppingMode: 'strict' | 'minor_extras'): MealIdea[] | null {
  return tonightResolvedCache.get(shoppingMode) ?? null
}

/**
 * Fires the request and stores it in the shared cache without waiting —
 * call this as early in the session as possible (Dashboard mount) so the
 * Chef tab and Tonight page can read an already-resolved result instead
 * of starting fresh.
 */
export function prewarmTonightSuggestions(params: TonightParams) {
  if (params.inventory.length === 0) return
  if (tonightCache.has(params.shoppingMode)) return
  tonightCache.set(params.shoppingMode, requestTonightSuggestions(params))
}

/**
 * Returns the cached in-flight/completed request for this mode if one
 * exists (e.g. from prewarmTonightSuggestions), otherwise starts a fresh one.
 */
export function getOrFetchTonightSuggestions(params: TonightParams): Promise<MealIdea[] | null> {
  const existing = tonightCache.get(params.shoppingMode)
  if (existing) return existing
  const promise = requestTonightSuggestions(params)
  tonightCache.set(params.shoppingMode, promise)
  return promise
}

/**
 * Always fires a fresh request — used when the user explicitly asks for
 * new ideas (toggle change, "Get more ideas" button).
 */
export function refetchTonightSuggestions(params: TonightParams): Promise<MealIdea[] | null> {
  const promise = requestTonightSuggestions(params)
  tonightCache.set(params.shoppingMode, promise)
  return promise
}

// ── Recipe Ideas ─────────────────────────────────────────────────────
// Unconstrained mode, no waste-reduction weighting, query or anchor-
// ingredient driven. Cached in sessionStorage keyed by query so a
// backgrounded/reloaded tab restores the last search.

export interface RecipeIdeasParams {
  inventory: InventoryItem[]
  defaultServings: number
  query?: string
  anchorIngredient?: string
  preferences?: ChefPreferences
}

export async function fetchRecipeIdeas(params: RecipeIdeasParams): Promise<MealIdea[] | null> {
  return requestMealIdeas({
    inventory: params.inventory,
    defaultServings: params.defaultServings,
    shoppingMode: 'unconstrained',
    weightPriorityItems: false,
    query: params.query,
    anchorIngredient: params.anchorIngredient,
    preferences: params.preferences,
  })
}

interface CachedRecipeIdeas {
  query: string
  suggestions: MealIdea[]
}

const STORAGE_KEY = 'chef-recipe-ideas-cache'

export function getCachedRecipeIdeas(): CachedRecipeIdeas | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCachedRecipeIdeas(query: string, suggestions: MealIdea[]) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query, suggestions }))
  } catch {
    // Storage full or unavailable (e.g. private browsing) — fail silently,
    // this is a convenience cache, not critical state.
  }
}
