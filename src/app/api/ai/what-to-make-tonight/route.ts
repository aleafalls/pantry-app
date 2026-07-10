import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const IngredientSchema = z.object({
  name: z.string().describe('Ingredient name — match the household inventory name when it\'s an on-hand item'),
  emoji: z.string().describe('A single emoji that best represents this specific ingredient, e.g. "🍗" for chicken, "🌿" for basil'),
  is_main: z.boolean().describe('True only for the single main/hero ingredient this suggestion centers on (usually the protein) — false for every supporting or side ingredient'),
})

const SuggestionSchema = z.object({
  idea: z.string().describe('A short meal idea, e.g. "Sheet-pan chicken with roasted zucchini and sweet potato fries"'),
  description: z.string().describe('1-2 sentences of practical guidance — not numbered steps'),
  ingredients_used: z.array(IngredientSchema).describe('On-hand items this idea uses'),
  ingredients_needed: z.array(IngredientSchema).describe('Additional items to buy — always empty when shopping is not allowed'),
})

const TonightSchema = z.object({
  suggestions: z.array(SuggestionSchema),
})

interface InventoryItem {
  name: string
  quantity: number
  unit: string
  category: string
}

interface Preferences {
  dietary_restrictions?: string[]
  favorite_cuisines?: string[]
  macro_goals?: string[]
}

const client = new Anthropic()

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const inventory: InventoryItem[] = Array.isArray(body?.inventory) ? body.inventory : []
  if (inventory.length === 0) {
    return NextResponse.json({ error: 'inventory is required' }, { status: 400 })
  }

  const priorityItems: string[] = Array.isArray(body?.priority_items) ? body.priority_items : []
  const allowShopping = Boolean(body?.allow_shopping)
  const defaultServings = Number(body?.default_servings) > 0 ? Number(body.default_servings) : 2
  const preferences: Preferences = body?.household_preferences ?? {}
  const dietaryRestrictions = preferences.dietary_restrictions ?? []
  const favoriteCuisines = preferences.favorite_cuisines ?? []
  const macroGoals = preferences.macro_goals ?? []

  const shoppingRule = allowShopping
    ? 'Suggestions may include up to 2 minor additional ingredients the household would need to pick up, but should mostly rely on what\'s already on hand.'
    : 'Every suggestion must use only ingredients already in the household\'s inventory — do not suggest anything requiring a store trip.'

  const systemPrompt = `You help a household decide what to cook tonight using what they already have on hand. Suggest practical, low-effort meal ideas — not formal recipes with precise measurements, just a workable combination and brief guidance. ${shoppingRule} Give slight preference to combinations that use ingredients flagged as good to use up, but don't force it if a better combination exists without them. Never suggest anything containing one of the household's dietary restrictions — treat every one as a hard exclude. Favorite cuisines and macro goals are soft preferences — lean into them when a good option fits, but don't force it. For each suggestion, mark exactly one ingredient as the main/hero ingredient (usually the protein) and every other ingredient as a side.`

  const inventoryLines = inventory.map(i => `${i.name} (${i.quantity} ${i.unit}, ${i.category})`).join('\n')

  const userPrompt = `Household inventory:
${inventoryLines}

Items that are older or in larger supply — give slight preference to using these when a good combination includes them:
${priorityItems.length > 0 ? priorityItems.join(', ') : 'none flagged'}

Household typically cooks for ${defaultServings} people.

Dietary restrictions (never include): ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(', ') : 'none'}
Favorite cuisines (soft preference): ${favoriteCuisines.length > 0 ? favoriteCuisines.join(', ') : 'none specified'}
Macro goals (soft preference): ${macroGoals.length > 0 ? macroGoals.join(', ') : 'none specified'}

Suggest 3-5 meal ideas for tonight.`

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: zodOutputFormat(TonightSchema),
      },
    })

    if (!response.parsed_output) {
      return NextResponse.json({ error: 'suggestion generation failed' }, { status: 502 })
    }

    return NextResponse.json(response.parsed_output)
  } catch {
    return NextResponse.json({ error: 'suggestion generation failed' }, { status: 502 })
  }
}
