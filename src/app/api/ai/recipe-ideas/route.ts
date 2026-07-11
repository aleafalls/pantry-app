import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const RecipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
  have_on_hand: z.boolean().describe('Whether this ingredient is already in the household inventory'),
})

const RecipeIdeaSchema = z.object({
  recipe_name: z.string().describe('e.g. "Chicken Carbonara"'),
  description: z.string().describe('1 sentence'),
  servings: z.number(),
  instructions: z.string(),
  ingredients: z.array(RecipeIngredientSchema),
})

const RecipeIdeasSchema = z.object({
  suggestions: z.array(RecipeIdeaSchema),
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

  const basePrompt = `You help a household discover specific, named recipes they could make using what they have on hand, filling in a few additional ingredients as needed. Prioritize genuinely good, well-known dishes over convenience — this is about discovering something worth making, not just using up what's in stock.`

  const directive = anchorIngredient
    ? ` Center every suggestion around ${anchorIngredient} specifically — different ways to prepare or feature it. The household also has other items on hand which suggestions may optionally incorporate, but ${anchorIngredient} should be the star of each one.`
    : query
      ? ` The household has given a specific direction they want to go: "${query}". Every suggestion should fit that direction, while still leaning on what's already in their inventory where it makes sense.`
      : ''

  const systemPrompt = `${basePrompt}${directive} Never suggest anything containing one of the household's dietary restrictions — treat every one as a hard exclude. Favorite cuisines and macro goals are soft preferences — lean into them when a good option fits, but don't force it. For each ingredient, mark have_on_hand true only if it matches something in the household's inventory.`

  const inventoryLines = inventory.map(i => `${i.name} (${i.quantity} ${i.unit}, ${i.category})`).join('\n')

  const finalLine = anchorIngredient
    ? `Suggest 3-5 specific, named recipes centered on: ${anchorIngredient}`
    : query
      ? `Suggest 3-5 specific, named recipes for: ${query}`
      : `Suggest 3-5 specific, named recipes using primarily what's on hand, with any additional ingredients needed clearly listed.`

  const userPrompt = `Household inventory:
${inventoryLines}

Household typically cooks for ${defaultServings} people.

Dietary restrictions (never include): ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(', ') : 'none'}
Favorite cuisines (soft preference): ${favoriteCuisines.length > 0 ? favoriteCuisines.join(', ') : 'none specified'}
Macro goals (soft preference): ${macroGoals.length > 0 ? macroGoals.join(', ') : 'none specified'}

${finalLine}`

  try {
    const response = await client.messages.parse({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: zodOutputFormat(RecipeIdeasSchema),
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
