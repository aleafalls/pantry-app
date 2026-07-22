import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, UNITS_GROUPED } from '@/lib/constants'
import { CANONICAL_NAME_DESCRIPTION } from '@/lib/canonicalIngredient'
import { ingredientIdentitySet, inventoryIdentityStrings } from '@/lib/recipeMatch'

const client = new Anthropic()

const UNITS = Object.values(UNITS_GROUPED).flat()
const MAX_PHOTO_BYTES = 3.5 * 1024 * 1024 // stays under Claude's base64 image size limit once encoded
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// category/unit are plain strings, not z.enum — an enum mismatch throws and
// discards the entire parsed response, so an unmapped suggestion for one
// field shouldn't sink the rest. Valid values enforced afterward instead.
const ExtractedLineSchema = z.object({
  name: z.string().describe('The product as printed/implied on the receipt, brand kept if present (e.g. "Daisy Sour Cream")'),
  generic_name: z.string().describe('The name to give this item if it\'s new to the household\'s inventory — natural and non-branded (e.g. "Greek yogurt", "liquid egg whites", "shredded cheddar cheese"), UNLESS the brand IS the product with no common generic equivalent a shopper would use instead (e.g. "Babybel", "Talenti", "Nutella", "La Croix") — keep the brand in that case. Most grocery items should NOT keep their brand here.'),
  canonical_name: z.string().describe(CANONICAL_NAME_DESCRIPTION),
  quantity: z.number().describe('The total amount purchased, expressed IN THE `unit` FIELD BELOW. Only multiply when the package states an explicit multi-count ("24-count", "6-count", "2-count", "pack of N") — convert that count into `unit`: a 24-count egg carton with unit "dozen" -> quantity 2 (24÷12); a 2-count 2.5 lb bag with unit "lb" -> quantity 5 (2×2.5); a 6-count box with unit "each" -> quantity 6. Do NOT confuse a single container\'s own size with a count — "48 oz" or "36 oz" describing ONE bottle/bag/tub (no "-count" stated) means quantity 1 if unit is "each", or quantity 48/36 only if unit is "oz" itself. 1 if not explicit and no multi-count applies.'),
  unit: z.string().describe('The most precise unit this is typically sold/measured in — "each" if unclear. `quantity` must already be expressed in this unit (see quantity field) — pick whichever unit keeps that conversion simplest.'),
  price: z.number().nullable().describe('The price paid for this line in USD — null if not legible'),
  suggested_category: z.string().nullable().describe('Best matching category for a new item — null if unclear'),
  suggested_emoji: z.string().describe('A single emoji representing this item'),
})

const ReceiptSchema = z.object({
  store: z.string().nullable().describe('Store name from the receipt header, if visible'),
  items: z.array(ExtractedLineSchema).describe('Only actual purchased products — never tax, subtotal, total, discount, or payment lines'),
})

function coerceEnum(value: string | null, validValues: string[]): string | null {
  return value && validValues.includes(value) ? value : null
}

interface HouseholdItemRow {
  id: string
  name: string
  canonical_name: string | null
  emoji: string | null
  default_unit: string
  category: string
  estimated_price: number | null
}

interface InventoryRow {
  id: string
  item_id: string
  location: string
  quantity: number
  unit: string
}

function findMatch(extracted: { name: string; canonical_name: string }, items: HouseholdItemRow[]): HouseholdItemRow | null {
  const ids = ingredientIdentitySet(extracted.name, extracted.canonical_name)
  return items.find(inv => inventoryIdentityStrings({ name: inv.name, canonicalName: inv.canonical_name }).some(id => ids.has(id))) ?? null
}

function avg(nums: number[]): number | null {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

// Same title-casing as the New Item form's toTitleCase, so a name typed
// there and a name arriving via receipt scan land in the same style.
function toTitleCase(s: string): string {
  return s.replace(/(^|\s)\S/g, c => c.toUpperCase())
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()
  if (!profile?.household_id) {
    return NextResponse.json({ error: 'No household found.' }, { status: 400 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('photo')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A photo is required.' }, { status: 400 })
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Please use a JPG, PNG, or WEBP photo.' }, { status: 400 })
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'That photo is too large — try a smaller image.' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  // Best-effort archival copy — extraction below works off the in-memory
  // bytes regardless, so a storage hiccup shouldn't block the import.
  const ext = file.type.split('/')[1] ?? 'jpg'
  const path = `${profile.household_id}/${crypto.randomUUID()}.${ext}`
  supabase.storage.from('receipt-photos').upload(path, bytes, { contentType: file.type })
    .catch(err => console.error('Receipt photo upload failed:', err))

  let parsed: z.infer<typeof ReceiptSchema> | null = null
  try {
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: `Extract purchased grocery items from a photographed receipt. For each item, also give its canonical/generic form (${CANONICAL_NAME_DESCRIPTION}) so it can be matched to a household's existing inventory regardless of brand. Each receipt line is a distinct product — give it its own canonical_name and never reuse the same canonical_name for two lines unless they are truly the same product (do not merge, say, a coffee line and a chicken line just because they share a word). Never include tax, subtotal, total, discount, coupon, or payment-method lines as items. If the photo isn't a receipt, return an empty items array.

Valid categories: ${CATEGORIES.join(', ')}
Valid units: ${UNITS.join(', ')}`,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: bytes.toString('base64') } },
          { type: 'text', text: 'Extract the purchased items from this receipt.' },
        ],
      }],
      output_config: { format: zodOutputFormat(ReceiptSchema) },
    })
    parsed = response.parsed_output
  } catch {
    parsed = null
  }

  if (!parsed || parsed.items.length === 0) {
    return NextResponse.json({ error: "Couldn't find any items on that receipt." }, { status: 422 })
  }

  const { data: householdItems } = await supabase
    .from('items')
    .select('id, name, canonical_name, emoji, default_unit, category, estimated_price')
    .eq('household_id', profile.household_id)
    .eq('active', true)

  const items = (householdItems ?? []) as HouseholdItemRow[]

  // Merge duplicate lines — same matched item, or same canonical name among
  // unmatched — by summing quantity and averaging price, rather than
  // showing the same item twice.
  const matchedByItemId = new Map<string, { item: HouseholdItemRow; quantity: number; prices: number[]; receiptTexts: string[] }>()
  const unmatchedByCanonical = new Map<string, { genericName: string; canonicalName: string; receiptTexts: string[]; quantity: number; prices: number[]; unit: string; category: string | null; emoji: string }>()

  for (const line of parsed.items) {
    if (!line.name.trim() || !line.canonical_name.trim()) continue
    const match = findMatch({ name: line.name, canonical_name: line.canonical_name }, items)

    if (match) {
      const existing = matchedByItemId.get(match.id)
      if (existing) {
        existing.quantity += line.quantity
        if (line.price != null) existing.prices.push(line.price)
        existing.receiptTexts.push(line.name)
      } else {
        matchedByItemId.set(match.id, {
          item: match,
          quantity: line.quantity,
          prices: line.price != null ? [line.price] : [],
          receiptTexts: [line.name],
        })
      }
    } else {
      const key = line.canonical_name.trim().toLowerCase()
      const existing = unmatchedByCanonical.get(key)
      if (existing) {
        existing.quantity += line.quantity
        if (line.price != null) existing.prices.push(line.price)
        existing.receiptTexts.push(line.name)
      } else {
        unmatchedByCanonical.set(key, {
          genericName: toTitleCase(line.generic_name.trim() || line.name.trim()),
          canonicalName: line.canonical_name.trim(),
          receiptTexts: [line.name],
          quantity: line.quantity,
          prices: line.price != null ? [line.price] : [],
          unit: coerceEnum(line.unit, UNITS) ?? 'each',
          category: coerceEnum(line.suggested_category, CATEGORIES),
          emoji: line.suggested_emoji,
        })
      }
    }
  }

  const matchedItemIds = [...matchedByItemId.keys()]
  const { data: inventoryRowsData } = matchedItemIds.length > 0
    ? await supabase
      .from('inventory')
      .select('id, item_id, location, quantity, unit')
      .in('item_id', matchedItemIds)
    : { data: [] as InventoryRow[] }
  const inventoryByItemId = new Map<string, InventoryRow[]>()
  for (const row of (inventoryRowsData ?? []) as InventoryRow[]) {
    const list = inventoryByItemId.get(row.item_id) ?? []
    list.push(row)
    inventoryByItemId.set(row.item_id, list)
  }

  const matched = [...matchedByItemId.values()].map(m => ({
    itemId: m.item.id,
    name: m.item.name,
    emoji: m.item.emoji,
    unit: inventoryByItemId.get(m.item.id)?.[0]?.unit ?? m.item.default_unit,
    receiptText: m.receiptTexts.join(', '),
    quantity: m.quantity,
    price: avg(m.prices),
    inventoryRows: (inventoryByItemId.get(m.item.id) ?? []).map(r => ({ id: r.id, location: r.location, quantity: r.quantity })),
  }))

  const unmatched = [...unmatchedByCanonical.values()].map(u => ({
    name: u.genericName,
    receiptText: u.receiptTexts.join(', '),
    canonicalName: u.canonicalName,
    emoji: u.emoji,
    unit: u.unit,
    category: u.category,
    quantity: u.quantity,
    price: avg(u.prices),
  }))

  return NextResponse.json({ store: parsed.store, matched, unmatched })
}
