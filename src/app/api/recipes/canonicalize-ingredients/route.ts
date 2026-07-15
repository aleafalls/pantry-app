import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { CATEGORIES } from '@/lib/constants'
import { CANONICAL_NAME_DESCRIPTION } from '@/lib/canonicalIngredient'

const client = new Anthropic()

const CanonicalizedIngredientSchema = z.object({
  index: z.number().describe('The 0-based index of this ingredient from the input list — echo it back unchanged'),
  canonical_name: z.string().describe(CANONICAL_NAME_DESCRIPTION),
  category: z.enum(CATEGORIES as [string, ...string[]]).nullable().describe('Best matching category, or null if unclear'),
  is_staple: z.boolean().describe('True only for near-universal pantry basics almost every household already has (salt, black pepper, cooking oil, water, sugar, flour) — false for everything else, including specific proteins, produce, and dairy'),
})

const ResponseSchema = z.object({
  results: z.array(CanonicalizedIngredientSchema),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const names: string[] = Array.isArray(body?.names)
    ? body.names.filter((n: unknown): n is string => typeof n === 'string')
    : []

  if (names.length === 0) {
    return NextResponse.json({ error: 'names is required' }, { status: 400 })
  }

  const listText = names.map((n, i) => `${i}: ${n}`).join('\n')

  const systemPrompt = `You help a pantry app match recipe ingredients to household inventory items that may be worded differently. For each ingredient, determine its canonical form (${CANONICAL_NAME_DESCRIPTION}), its likely category, and whether it's a near-universal pantry staple. Return one result per ingredient, in the same order, each carrying its original index.`

  const userPrompt = `Ingredients (index: name):
${listText}

Valid categories: ${CATEGORIES.join(', ')}`

  try {
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: zodOutputFormat(ResponseSchema),
      },
    })

    if (!response.parsed_output) {
      return NextResponse.json({ error: 'canonicalization failed' }, { status: 502 })
    }

    return NextResponse.json(response.parsed_output)
  } catch {
    return NextResponse.json({ error: 'canonicalization failed' }, { status: 502 })
  }
}
