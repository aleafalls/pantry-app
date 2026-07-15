export interface CanonicalizedIngredient {
  canonicalName: string
  category: string | null
  isStaple: boolean
}

interface CanonicalizeResult {
  index: number
  canonical_name: string
  category: string | null
  is_staple: boolean
}

// Called right before any insert into recipe_ingredients, regardless of
// where the ingredients came from (manual entry, edit, saved recipe idea,
// or a web import that already went through the manual-save form) — one
// call site for the whole app instead of duplicating this in every AI
// generation path. Returns null per-entry on failure so callers can fall
// back to storing no canonical data rather than failing the whole save.
export async function canonicalizeIngredients(names: string[]): Promise<(CanonicalizedIngredient | null)[]> {
  if (names.length === 0) return []
  try {
    const res = await fetch('/api/recipes/canonicalize-ingredients', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ names }),
    })
    if (!res.ok) return names.map(() => null)
    const data = await res.json()
    const results: CanonicalizeResult[] = data.results ?? []
    const byIndex = new Map(results.map(r => [r.index, r]))
    return names.map((_, i) => {
      const r = byIndex.get(i)
      return r ? { canonicalName: r.canonical_name, category: r.category, isStaple: r.is_staple } : null
    })
  } catch {
    return names.map(() => null)
  }
}
