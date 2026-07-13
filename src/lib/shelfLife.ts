// Powers "Use These Up" — ranks items by how much of their estimated shelf
// life has elapsed, not just raw age, so pantry staples don't drown out
// genuinely perishable items (or vice versa).

// These categories are excluded entirely — shelf life isn't a meaningful
// consideration for them, so they should never appear in "Use These Up".
const CATEGORIES_WITHOUT_SHELF_LIFE = new Set([
  'Spices & Seasonings',
  'Baking',
  'Pet Supplies',
  'Household & Other',
])

const SHELF_LIFE_DAYS_BY_CATEGORY: Record<string, number> = {
  'Produce': 7,
  'Meat & Seafood': 5,
  'Dairy & Refrigerated': 14,
  'Frozen': 180,
  'Canned Goods': 730,
  'Snacks': 120,
  'Beverages': 60,
  'Condiments & Sauces': 180,
  'Dry Goods & Grains': 365,
}

const DEFAULT_SHELF_LIFE_DAYS = 90

// Storage location can extend shelf life well past the category default
// (freezing or dry storage keeps things edible far longer than the category
// baseline assumes) — floor the estimate at these minimums.
const MIN_SHELF_LIFE_DAYS_BY_LOCATION: Record<string, number> = {
  freezer: 180,
  spice_rack: 730,
}

export function tracksShelfLife(category: string): boolean {
  return !CATEGORIES_WITHOUT_SHELF_LIFE.has(category)
}

// Higher = more of its estimated shelf life has elapsed (more urgent to use).
export function shelfLifeRatio(purchaseDate: string, category: string, location: string): number {
  const ageDays = (Date.now() - new Date(purchaseDate).getTime()) / 86400000
  const base = SHELF_LIFE_DAYS_BY_CATEGORY[category] ?? DEFAULT_SHELF_LIFE_DAYS
  const locationMin = MIN_SHELF_LIFE_DAYS_BY_LOCATION[location]
  const shelfLifeDays = locationMin ? Math.max(base, locationMin) : base
  return ageDays / shelfLifeDays
}
