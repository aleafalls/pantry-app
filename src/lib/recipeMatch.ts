import type { InventoryItem } from './chefData'

export interface MatchIngredient {
  name: string
  canonicalName?: string | null
  isStaple?: boolean
}

// Prefers a canonical-name match (e.g. "extra virgin olive oil" == "olive
// oil") when both sides have one; falls back to the original exact-name
// match otherwise — so pre-canonicalization data keeps working unchanged.
function isOnHand(ing: MatchIngredient, inventory: InventoryItem[]): boolean {
  const norm = ing.name.trim().toLowerCase()
  const canonicalNorm = ing.canonicalName?.trim().toLowerCase()
  return inventory.some(inv => {
    if (inv.quantity <= 0) return false
    if (canonicalNorm && inv.canonicalName) {
      return inv.canonicalName.trim().toLowerCase() === canonicalNorm
    }
    return inv.name.trim().toLowerCase() === norm
  })
}

// Pantry staples (salt, pepper, oil, etc.) are excluded from the count
// entirely — a recipe shouldn't score lower just because a pinch of salt
// isn't tracked in inventory.
export function computeMatchPercent(ingredients: MatchIngredient[], inventory: InventoryItem[]): number {
  const counted = ingredients.filter(ing => !ing.isStaple)
  // A recipe made entirely of staples (salt, pepper, oil...) is something
  // the household is assumed to already have everything for — 100% match,
  // not 0%, which is what filtering everything out would otherwise leave.
  if (counted.length === 0) return 100
  const have = counted.filter(ing => isOnHand(ing, inventory)).length
  return Math.round((have / counted.length) * 100)
}
