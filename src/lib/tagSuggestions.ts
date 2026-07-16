import { createClient } from '@/lib/supabase/client'

function dedupeSorted(tags: string[]): string[] {
  const seen = new Map<string, string>()
  for (const tag of tags) {
    const key = tag.toLowerCase()
    if (!seen.has(key)) seen.set(key, tag)
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
}

/** Distinct tags already used across a household's items, for tag-input autocomplete. */
export async function fetchItemTagSuggestions(householdId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase.from('items').select('tags').eq('household_id', householdId)
  return dedupeSorted((data ?? []).flatMap(row => row.tags ?? []))
}

/** Distinct tags already used across a household's recipes, for tag-input autocomplete. */
export async function fetchRecipeTagSuggestions(householdId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase.from('recipes').select('tags').eq('household_id', householdId)
  return dedupeSorted((data ?? []).flatMap(row => row.tags ?? []))
}
