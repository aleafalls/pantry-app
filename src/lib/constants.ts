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
  { value: 'pantry',     label: 'Pantry',     emoji: '🥫' },
  { value: 'fridge',     label: 'Fridge',     emoji: '🧊' },
  { value: 'freezer',    label: 'Freezer',    emoji: '❄️' },
  { value: 'spice_rack', label: 'Spice Rack', emoji: '🧂' },
]

export const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]
