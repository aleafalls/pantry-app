export const CATEGORIES = [
  'Canned Goods',
  'Dry Goods & Grains',
  'Baking',
  'Condiments & Sauces',
  'Snacks',
  'Beverages',
  'Frozen',
  'Dairy & Refrigerated',
  'Produce',
  'Meat & Seafood',
  'Spices & Seasonings',
  'Household & Other',
]

export const UNITS_GROUPED: Record<string, string[]> = {
  'Count':           ['each', 'pair', 'pack', 'box', 'bag', 'bunch', 'loaf', 'roll'],
  'Volume':          ['fl oz', 'cup', 'pint', 'quart', 'gallon', 'ml', 'L'],
  'Weight':          ['oz', 'lb', 'g', 'kg'],
  'Pantry-specific': ['can', 'jar', 'bottle', 'carton', 'pouch', 'tub', 'block', 'slice'],
}

export const LOCATIONS = [
  { value: 'pantry',     label: 'Pantry'     },
  { value: 'fridge',     label: 'Fridge'     },
  { value: 'freezer',    label: 'Freezer'    },
  { value: 'spice_rack', label: 'Spice Rack' },
]
