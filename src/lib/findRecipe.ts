import { fetchRecipeImport, setRecipeImportDraft } from './recipeImport'

interface FindRecipeResult {
  found: boolean
  url: string | null
  sourceName: string | null
}

async function fetchFindRecipe(idea: string, keyIngredients: string[]): Promise<FindRecipeResult | null> {
  try {
    const res = await fetch('/api/ai/find-recipe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idea, key_ingredients: keyIngredients }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      found: Boolean(data.found),
      url: data.url ?? null,
      sourceName: data.source_name ?? null,
    }
  } catch {
    return null
  }
}

export type FindRecipeOutcome =
  | { status: 'success' }
  | { status: 'not_found' }
  | { status: 'import_failed'; message: string }
  | { status: 'error' }

/**
 * "Find the Recipe" — Stage 2 of an AI meal idea. Searches for one real
 * matching recipe, then runs it through the exact same URL-import pipeline
 * as pasting a link manually (schema.org extraction, real photo, SSRF
 * protection — see src/app/api/recipes/import/route.ts). On success, the
 * result is stashed via setRecipeImportDraft for /chef/new to pick up —
 * same handoff as manual URL/photo import, so the caller just needs to
 * router.push('/chef/new') after a 'success' outcome.
 */
export async function findAndImportRecipe(
  idea: string,
  keyIngredients: string[] = [],
  onStage?: (stage: 'searching' | 'reading') => void
): Promise<FindRecipeOutcome> {
  onStage?.('searching')
  const found = await fetchFindRecipe(idea, keyIngredients)
  if (!found || !found.found || !found.url) return { status: 'not_found' }

  onStage?.('reading')
  const imported = await fetchRecipeImport(found.url)
  if (imported.error || !imported.data) {
    // Surface the server's own message — it already distinguishes "couldn't
    // reach the page" (fetch/network failure) from "reached it but found no
    // recipe" (extraction failure), which a single generic string would hide.
    return { status: 'import_failed', message: imported.error ?? "Found a recipe page but couldn't read the details from it." }
  }

  setRecipeImportDraft(imported.data)
  return { status: 'success' }
}
