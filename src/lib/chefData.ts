import type { SupabaseClient } from '@supabase/supabase-js'

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
 * Inventory + "good to use up" items (oldest and highest-quantity, deduped)
 * + household serving size — the shared context both the Chef page's
 * preview grid and the "View More" expanded page need for What to Make
 * Tonight (and, later, Recipe Ideas).
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

  const oldest = [...rows]
    .filter(r => r.purchase_date)
    .sort((a, b) => new Date(a.purchase_date!).getTime() - new Date(b.purchase_date!).getTime())
    .slice(0, 5)
    .map(r => r.items.name)

  const highestQuantity = [...rows]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(r => r.items.name)

  const priorityItems = Array.from(new Set([...oldest, ...highestQuantity]))

  return {
    inventory,
    priorityItems,
    defaultServings: household?.default_servings ?? 2,
  }
}
