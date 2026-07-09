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

// Open Food Facts' own `generic_name` field is almost never filled in by
// contributors. Its `categories_tags` hierarchy (broad → specific) is far
// more reliable — the last tag is usually the most specific one, e.g.
// "en:cherry-tomatoes" or "en:coffee-beans" rather than a brand name.
function genericNameFromCategories(categoriesTags: string[] | undefined): string | null {
  const last = categoriesTags?.at(-1)
  if (!last) return null
  const humanized = last.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').trim()
  return humanized || null
}

interface OpenFoodFactsProduct {
  product_name?: string
  product_name_en?: string
  generic_name?: string
  generic_name_en?: string
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

  // Prefer OFF's own generic_name if a contributor happened to fill it in
  // (rare in practice), otherwise derive one from the category hierarchy.
  const genericName = product.generic_name || product.generic_name_en
    || genericNameFromCategories(product.categories_tags)

  return NextResponse.json({
    found: true,
    name,
    genericName,
    category: guessCategory(categoryText),
  })
}
