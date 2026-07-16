import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const MealIdeaIngredientSchema = z.object({
  name: z.string().describe('Ingredient name — match the household inventory name when it\'s an on-hand item'),
  emoji: z.string().describe('A single emoji that best represents this specific ingredient, e.g. "🍗" for chicken, "🌿" for basil'),
  is_main: z.boolean().describe('True only for the single main/hero ingredient this suggestion centers on (usually the protein) — false for every supporting or side ingredient'),
  is_staple: z.boolean().describe('True only for near-universal pantry basics almost every household already has (salt, black pepper, cooking oil, butter, sugar, flour) — false for everything else, including specific proteins, produce, and dairy'),
  have_on_hand: z.boolean().describe('Whether this ingredient is already in the household inventory'),
})

const MealIdeaSchema = z.object({
  idea: z.string().describe('A short meal idea or specific named dish, e.g. "Sheet-pan chicken with roasted zucchini" or "Chicken Carbonara"'),
  description: z.string().describe('1-2 sentences'),
  ingredients: z.array(MealIdeaIngredientSchema),
})

const MealIdeasSchema = z.object({
  suggestions: z.array(MealIdeaSchema),
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

type ShoppingMode = 'strict' | 'minor_extras' | 'unconstrained'
const SHOPPING_MODES: ShoppingMode[] = ['strict', 'minor_extras', 'unconstrained']

const SHOPPING_RULES: Record<ShoppingMode, string> = {
  strict: 'Every suggestion must use only ingredients already in the household\'s inventory — do not suggest anything requiring a store trip.',
  minor_extras: 'Suggestions may include up to 2 minor additional ingredients the household would need to pick up, but should mostly rely on what\'s already on hand.',
  unconstrained: 'Suggestions don\'t need to be limited to what\'s on hand — prioritize genuinely good, specific, well-known dishes even if they require several additional ingredients; mark have_on_hand accurately per ingredient regardless.',
}

const client = new Anthropic()

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const inventory: InventoryItem[] = Array.isArray(body?.inventory) ? body.inventory : []
  if (inventory.length === 0) {
    return NextResponse.json({ error: 'inventory is required' }, { status: 400 })
  }

  const shoppingModeInput = typeof body?.shopping_mode === 'string' ? body.shopping_mode : 'strict'
  const shoppingMode: ShoppingMode = SHOPPING_MODES.includes(shoppingModeInput as ShoppingMode)
    ? shoppingModeInput as ShoppingMode
    : 'strict'

  const weightPriorityItems = Boolean(body?.weight_priority_items)
  const priorityItems: string[] = weightPriorityItems && Array.isArray(body?.priority_items) ? body.priority_items : []

  const anchorIngredient: string | null = typeof body?.anchor_ingredient === 'string' && body.anchor_ingredient.trim()
    ? body.anchor_ingredient.trim()
    : null
  const query: string | null = !anchorIngredient && typeof body?.query === 'string' && body.query.trim()
    ? body.query.trim()
    : null

  const defaultServings = Number(body?.default_servings) > 0 ? Number(body.default_servings) : 2
  const preferences: Preferences = body?.household_preferences ?? {}
  const dietaryRestrictions = preferences.dietary_restrictions ?? []
  const favoriteCuisines = preferences.favorite_cuisines ?? []
  const macroGoals = preferences.macro_goals ?? []

  const basePrompt = shoppingMode === 'unconstrained'
    ? 'You help a household discover specific, named meal ideas they could make using what they have on hand, filling in a few additional ingredients as needed. Prioritize genuinely good, well-known dishes over convenience — this is about discovering something worth making, not just using up what\'s in stock.'
    : 'You help a household decide what to cook using what they already have on hand. Suggest practical, low-effort meal ideas — not formal recipes with precise measurements, just a workable combination and brief guidance.'

  const priorityRule = weightPriorityItems
    ? ' Give slight preference to combinations that use ingredients flagged as good to use up, but don\'t force it if a better combination exists without them.'
    : ''

  const directive = anchorIngredient
    ? ` Center every suggestion around ${anchorIngredient} specifically — different ways to prepare or feature it. The household also has other items on hand which suggestions may optionally incorporate, but ${anchorIngredient} should be the star of each one.`
    : query
      ? ` The household has given a specific direction they want to go: "${query}". Every suggestion should fit that direction, while still leaning on what's already in their inventory where it makes sense.`
      : ''

  const systemPrompt = `${basePrompt} ${SHOPPING_RULES[shoppingMode]}${priorityRule}${directive} Never suggest anything containing one of the household's dietary restrictions — treat every one as a hard exclude. Favorite cuisines and macro goals are soft preferences — lean into them when a good option fits, but don't force it. For each suggestion, mark exactly one ingredient as the main/hero ingredient (usually the protein) and every other ingredient as a side. Also mark each ingredient as a staple or not — staples are near-universal pantry basics (salt, pepper, cooking oil, butter, etc.), used only to keep suggestion cards focused on the ingredients that actually define the dish. For each ingredient, mark have_on_hand true only if it matches something in the household's inventory.`

  const inventoryLines = inventory.map(i => `${i.name} (${i.quantity} ${i.unit}, ${i.category})`).join('\n')

  const priorityLines = weightPriorityItems
    ? `\n\nItems that are older or in larger supply — give slight preference to using these when a good combination includes them:\n${priorityItems.length > 0 ? priorityItems.join(', ') : 'none flagged'}`
    : ''

  const finalLine = anchorIngredient
    ? `Suggest 3-5 meal ideas centered on: ${anchorIngredient}`
    : query
      ? `Suggest 3-5 meal ideas for: ${query}`
      : `Suggest 3-5 meal ideas using primarily what's on hand.`

  const userPrompt = `Household inventory:
${inventoryLines}${priorityLines}

Household typically cooks for ${defaultServings} people.

Dietary restrictions (never include): ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(', ') : 'none'}
Favorite cuisines (soft preference): ${favoriteCuisines.length > 0 ? favoriteCuisines.join(', ') : 'none specified'}
Macro goals (soft preference): ${macroGoals.length > 0 ? macroGoals.join(', ') : 'none specified'}

${finalLine}`

  try {
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: zodOutputFormat(MealIdeasSchema),
      },
    })

    if (!response.parsed_output) {
      console.error('meal-ideas: no parsed_output')
      return NextResponse.json({ error: 'suggestion generation failed' }, { status: 502 })
    }

    return NextResponse.json(response.parsed_output)
  } catch (err) {
    console.error('meal-ideas failed:', err)
    return NextResponse.json({ error: 'suggestion generation failed' }, { status: 502 })
  }
}
