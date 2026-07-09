import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { CATEGORIES, UNITS_GROUPED, LOCATIONS } from '@/lib/constants'

const UNITS = Object.values(UNITS_GROUPED).flat()
const LOCATION_VALUES = LOCATIONS.map(l => l.value)

const EnrichmentSchema = z.object({
  category: z.enum(CATEGORIES as [string, ...string[]]).nullable()
    .describe('Only set if confident based on the item name; null otherwise'),
  unit: z.enum(UNITS as [string, ...string[]]).nullable()
    .describe('The most precise unit for how this item is typically sold/measured; null if the current unit is already correct or not confident'),
  location: z.enum(LOCATION_VALUES as [string, ...string[]]).nullable()
    .describe('Where this item is most likely stored in the home; null if the current location is already correct or not confident'),
  emoji: z.string().describe('A single emoji that best represents this item — prefer food/product emojis over generic symbols'),
  estimated_price: z.number().describe('Estimated price in USD per one unit of the chosen/given unit'),
})

const SHOPPING_TIER_DESCRIPTIONS: Record<number, string> = {
  1: 'shops primarily at discount/value grocery stores (e.g., Walmart, Aldi) and prefers store-brand products',
  2: 'shops at a mix of discount and mainstream grocery stores, usually choosing store-brand over name-brand',
  3: 'shops at typical mainstream grocery stores with a mix of name-brand and store-brand products',
  4: 'shops at mainstream grocery stores but frequently chooses organic or premium options for some items',
  5: 'shops primarily at premium/specialty grocery stores (e.g., Whole Foods) and prefers organic products',
}

const client = new Anthropic()

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const category = typeof body.category === 'string' ? body.category : ''
  const unit = typeof body.unit === 'string' && body.unit ? body.unit : 'each'
  const location = typeof body.location === 'string' && body.location ? body.location : 'pantry'
  const city = typeof body.city === 'string' ? body.city : ''
  const state = typeof body.state === 'string' ? body.state : ''
  const tierInput = Number(body.shopping_tier)
  const shoppingTier = tierInput >= 1 && tierInput <= 5 ? tierInput : 3

  const region = city && state ? `${city}, ${state}` : (city || state || 'unknown — use typical US grocery pricing')

  const systemPrompt = `You help a household pantry app enrich a new grocery item with details it doesn't have yet: category, unit, storage location, emoji, and estimated price. Only suggest a category, unit, or storage location if you're reasonably confident based on the item name — leave it null rather than guess. Emoji and price should always be provided.`

  const userPrompt = `Item: ${name}
Category: ${category || '(not yet set)'}
Unit: ${unit} (currently the default — suggest a more precise one if appropriate)
Storage location: ${location} (currently the default — suggest a more precise one if appropriate)
Region: ${region}
Shopping style: This household ${SHOPPING_TIER_DESCRIPTIONS[shoppingTier]}.

Valid categories: ${CATEGORIES.join(', ')}

Valid units: ${UNITS.join(', ')}

Valid storage locations: ${LOCATION_VALUES.join(', ')}`

  try {
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: zodOutputFormat(EnrichmentSchema),
      },
    })

    if (!response.parsed_output) {
      return NextResponse.json({ error: 'enrichment failed' }, { status: 502 })
    }

    return NextResponse.json(response.parsed_output)
  } catch {
    return NextResponse.json({ error: 'enrichment failed' }, { status: 502 })
  }
}
