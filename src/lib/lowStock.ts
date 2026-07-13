// Shared "running low" logic used by both the dashboard widget and the
// shopping list resync, so the two surfaces never disagree on what counts
// as low. An item counts as low only when it has alerting turned on
// (auto_shopping_list) AND is at/under its threshold (or manually flagged).

export interface LowStockInventoryRow {
  quantity: number
  location?: string
  manual_low_flag: boolean
  items: {
    id: string
    name: string
    emoji?: string | null
    low_threshold: number
    auto_shopping_list: boolean | null
    active: boolean
  }
}

export interface AggregatedItem {
  itemId: string
  name: string
  emoji: string | null
  totalQuantity: number
  threshold: number
  manualLow: boolean
  autoShoppingList: boolean
  primaryLocation: string
}

// Sums quantity for an item across all its inventory rows (locations), and
// picks the location with the highest quantity as the one to display.
export function aggregateInventoryByItem(rows: LowStockInventoryRow[]): AggregatedItem[] {
  const map = new Map<string, AggregatedItem & { primaryQty: number }>()

  for (const row of rows) {
    if (!row.items.active) continue
    const existing = map.get(row.items.id)
    if (existing) {
      existing.totalQuantity += row.quantity
      existing.manualLow = existing.manualLow || row.manual_low_flag
      if (row.quantity > existing.primaryQty && row.location) {
        existing.primaryLocation = row.location
        existing.primaryQty = row.quantity
      }
    } else {
      map.set(row.items.id, {
        itemId: row.items.id,
        name: row.items.name,
        emoji: row.items.emoji ?? null,
        totalQuantity: row.quantity,
        threshold: row.items.low_threshold,
        manualLow: row.manual_low_flag,
        autoShoppingList: row.items.auto_shopping_list ?? true,
        primaryLocation: row.location ?? '',
        primaryQty: row.quantity,
      })
    }
  }

  return Array.from(map.values())
}

export function isRunningLow(item: Pick<AggregatedItem, 'totalQuantity' | 'threshold' | 'manualLow' | 'autoShoppingList'>) {
  return item.autoShoppingList && (item.totalQuantity <= item.threshold || item.manualLow)
}
