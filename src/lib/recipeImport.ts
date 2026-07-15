export interface RecipeImportIngredient {
  name: string
  quantity: string
  unit: string
}

export interface RecipeImportDraft {
  name: string
  courseType: string
  tags: string[]
  servings: number
  totalTimeMinutes: number | ''
  ingredients: RecipeImportIngredient[]
  instructions: string
  imageUrl: string | null
  sourceUrl: string
}

const STORAGE_KEY = 'chef-recipe-import-draft'

export async function fetchRecipeImport(url: string): Promise<{ data?: RecipeImportDraft; error?: string }> {
  try {
    const res = await fetch('/api/recipes/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error ?? "Couldn't import that recipe." }
    return {
      data: {
        name: body.name ?? '',
        courseType: body.courseType ?? '',
        tags: body.tags ?? [],
        servings: body.servings ?? 4,
        totalTimeMinutes: body.totalTimeMinutes ?? '',
        ingredients: body.ingredients ?? [],
        instructions: body.instructions ?? '',
        imageUrl: body.imageUrl ?? null,
        sourceUrl: url,
      },
    }
  } catch {
    return { error: "Couldn't import that recipe." }
  }
}

export function setRecipeImportDraft(draft: RecipeImportDraft) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Storage full or unavailable — the import page will still route to
    // /chef/new, it just won't be pre-filled.
  }
}

// Reads and clears in one step — the draft is only meant to survive the
// single redirect from /chef/import to /chef/new, not linger afterward.
export function takeRecipeImportDraft(): RecipeImportDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(STORAGE_KEY)
    return JSON.parse(raw)
  } catch {
    return null
  }
}
