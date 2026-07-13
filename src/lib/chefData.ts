import type { SupabaseClient } from '@supabase/supabase-js'
import { tracksShelfLife, shelfLifeRatio } from './shelfLife'

export interface InventoryItem {
  id: string
  itemId: string
  name: string
  quantity: number
  unit: string
  category: string
  location: string
}

export interface ChefContext {
  inventory: InventoryItem[]
  priorityItems: string[]
  defaultServings: number
}

/**
 * Inventory + "good to use up" items (most shelf-life-urgent and
 * highest-quantity, deduped) + household serving size — the shared context
 * both the Chef page's preview grid and the "View More" expanded page need
 * for What to Make Tonight (and, later, Recipe Ideas). Shelf-life urgency
 * uses the same category/location-aware ratio as the dashboard's "Use
 * These Up" (see src/lib/shelfLife.ts) rather than raw purchase-date age,
 * so a wilting vegetable outranks a can of beans bought the same day.
 */
export async function getChefContext(supabase: SupabaseClient, householdId: string): Promise<ChefContext> {
  const [{ data: inventoryRows }, { data: household }] = await Promise.all([
    supabase
      .from('inventory')
      .select('id, item_id, quantity, unit, location, purchase_date, items!inner(name, category, active)')
      .eq('household_id', householdId)
      .eq('items.active', true),
    supabase
      .from('households')
      .select('default_servings')
      .eq('id', householdId)
      .single(),
  ])

  const rows = (inventoryRows ?? []) as unknown as {
    id: string; item_id: string; quantity: number; unit: string; location: string; purchase_date: string | null
    items: { name: string; category: string }
  }[]

  const inventory: InventoryItem[] = rows.map(r => ({
    id: r.id,
    itemId: r.item_id,
    name: r.items.name,
    quantity: r.quantity,
    unit: r.unit,
    category: r.items.category,
    location: r.location,
  }))

  const mostUrgent = [...rows]
    .filter((r): r is typeof r & { purchase_date: string } => Boolean(r.purchase_date))
    .filter(r => tracksShelfLife(r.items.category))
    .sort((a, b) =>
      shelfLifeRatio(b.purchase_date, b.items.category, b.location) -
      shelfLifeRatio(a.purchase_date, a.items.category, a.location))
    .slice(0, 5)
    .map(r => r.items.name)

  const highestQuantity = [...rows]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(r => r.items.name)

  const priorityItems = Array.from(new Set([...mostUrgent, ...highestQuantity]))

  return {
    inventory,
    priorityItems,
    defaultServings: household?.default_servings ?? 2,
  }
}
