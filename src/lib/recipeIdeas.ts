import type { ChefPreferences, InventoryItem } from './chefData'

export interface RecipeIdeaIngredient {
  name: string
  quantity: string
  unit: string
  have_on_hand: boolean
}

export interface RecipeIdea {
  recipe_name: string
  emoji: string
  description: string
  servings: number
  instructions: string[]
  ingredients: RecipeIdeaIngredient[]
}

export interface RecipeIdeasParams {
  inventory: InventoryItem[]
  defaultServings: number
  query?: string
  anchorIngredient?: string
  preferences?: ChefPreferences
}

export async function fetchRecipeIdeas(params: RecipeIdeasParams): Promise<RecipeIdea[] | null> {
  try {
    const res = await fetch('/api/ai/recipe-ideas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        inventory: params.inventory,
        default_servings: params.defaultServings,
        query: params.query,
        anchor_ingredient: params.anchorIngredient,
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

export function matchPercent(ingredients: RecipeIdeaIngredient[]): number {
  if (ingredients.length === 0) return 0
  const have = ingredients.filter(i => i.have_on_hand).length
  return Math.round((have / ingredients.length) * 100)
}

interface CachedRecipeIdeas {
  query: string
  suggestions: RecipeIdea[]
}

const STORAGE_KEY = 'chef-recipe-ideas-cache'

// Backed by sessionStorage (not just a module variable) so the most recent
// Ideas search survives a real page reload — not just in-app navigation.
// This matters on mobile/PWA, where a backgrounded tab often gets its JS
// context killed and reloaded fresh on return. sessionStorage clears when
// the browser tab actually closes, so this never outlives the session.
export function getCachedRecipeIdeas(): CachedRecipeIdeas | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCachedRecipeIdeas(query: string, suggestions: RecipeIdea[]) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query, suggestions }))
  } catch {
    // Storage full or unavailable (e.g. private browsing) — fail silently,
    // this is a convenience cache, not critical state.
  }
}
