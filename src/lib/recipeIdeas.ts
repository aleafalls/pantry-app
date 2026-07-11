import type { InventoryItem } from './chefData'

export interface RecipeIdeaIngredient {
  name: string
  quantity: string
  unit: string
  have_on_hand: boolean
}

export interface RecipeIdea {
  recipe_name: string
  description: string
  servings: number
  instructions: string
  ingredients: RecipeIdeaIngredient[]
}

export interface RecipeIdeasParams {
  inventory: InventoryItem[]
  defaultServings: number
  query?: string
  anchorIngredient?: string
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

// Module-level so it survives Next.js client-side navigation — remembers
// only the most recent Ideas search, so leaving the tab and coming back
// restores what was already generated instead of starting over.
let lastIdeas: CachedRecipeIdeas | null = null

export function getCachedRecipeIdeas(): CachedRecipeIdeas | null {
  return lastIdeas
}

export function setCachedRecipeIdeas(query: string, suggestions: RecipeIdea[]) {
  lastIdeas = { query, suggestions }
}
