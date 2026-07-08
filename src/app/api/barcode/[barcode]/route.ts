import { NextResponse } from 'next/server'
import { CATEGORIES } from '@/lib/constants'

// Best-effort keyword mapping from Open Food Facts category text to our own category list.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Canned Goods': ['canned', 'tinned', 'preserved'],
  'Dry Goods & Grains': ['pasta', 'rice', 'grain', 'cereal', 'flour', 'noodle', 'legume', 'bean'],
  'Baking': ['baking', 'sugar', 'cake', 'yeast', 'chocolate-chip'],
  'Condiments & Sauces': ['sauce', 'condiment', 'ketchup', 'mustard', 'mayonnaise', 'dressing', 'vinegar'],
  'Snacks': ['snack', 'chips', 'crisps', 'crackers', 'popcorn', 'pretzel', 'candy', 'sweets'],
  'Beverages': ['beverage', 'drink', 'juice', 'soda', 'water', 'coffee', 'tea', 'soft-drink'],
  'Frozen': ['frozen'],
  'Dairy & Refrigerated': ['dairy', 'cheese', 'milk', 'yogurt', 'yoghurt', 'butter', 'egg'],
  'Produce': ['fruit', 'vegetable', 'produce'],
  'Meat & Seafood': ['meat', 'poultry', 'beef', 'pork', 'chicken', 'fish', 'seafood', 'sausage'],
  'Spices & Seasonings': ['spice', 'seasoning', 'herb', 'salt', 'pepper'],
}

function guessCategory(text: string): string | null {
  const lower = text.toLowerCase()
  for (const category of CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category]
    if (keywords?.some(k => lower.includes(k))) return category
  }
  return null
}

interface OpenFoodFactsProduct {
  product_name?: string
  product_name_en?: string
  categories?: string
  categories_tags?: string[]
}

interface OpenFoodFactsResponse {
  status: number
  product?: OpenFoodFactsProduct
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const { barcode } = await params

  let data: OpenFoodFactsResponse
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`, {
      headers: { 'User-Agent': 'LemmyPantryApp/1.0 - pantry inventory app' },
    })
    if (!res.ok) return NextResponse.json({ found: false })
    data = await res.json()
  } catch {
    return NextResponse.json({ found: false })
  }

  const product = data.product
  const name = product?.product_name || product?.product_name_en || ''

  if (data.status !== 1 || !product || !name) {
    return NextResponse.json({ found: false })
  }

  const categoryText = [product.categories, ...(product.categories_tags ?? [])].filter(Boolean).join(' ')

  return NextResponse.json({
    found: true,
    name,
    category: guessCategory(categoryText),
  })
}
