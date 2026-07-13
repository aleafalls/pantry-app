import type { InventoryItem } from './chefData'

// Same exact-name-match-after-normalization approach used everywhere else
// ingredients get checked against real inventory (IngredientStockPlanner,
// the AI suggestion sheets) — no fuzzy matching anywhere in this app.
function isOnHand(name: string, inventory: InventoryItem[]): boolean {
  const norm = name.trim().toLowerCase()
  return inventory.some(inv => inv.name.trim().toLowerCase() === norm && inv.quantity > 0)
}

export function computeMatchPercent(ingredientNames: string[], inventory: InventoryItem[]): number {
  if (ingredientNames.length === 0) return 0
  const have = ingredientNames.filter(name => isOnHand(name, inventory)).length
  return Math.round((have / ingredientNames.length) * 100)
}
