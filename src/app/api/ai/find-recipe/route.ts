import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const client = new Anthropic()

const FindRecipeSchema = z.object({
  found: z.boolean().describe('Whether a real, well-matching recipe was found via search'),
  url: z.string().nullable().describe('The exact URL of the best matching real recipe found via the web_search tool — null if found is false. Never invent a URL.'),
  source_name: z.string().nullable().describe('Short site or publisher name for url, e.g. "Bon Appétit" — null if found is false.'),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const idea = typeof body?.idea === 'string' ? body.idea.trim() : ''
  if (!idea) {
    return NextResponse.json({ error: 'idea is required' }, { status: 400 })
  }
  const keyIngredients: string[] = Array.isArray(body?.key_ingredients)
    ? body.key_ingredients.filter((n: unknown): n is string => typeof n === 'string')
    : []

  const systemPrompt = 'You find one real, well-reviewed recipe online that matches a given meal idea. Use the web_search tool to search for it, then return the exact URL of the single best match. If you can\'t find a solid match, set found to false and leave url/source_name null rather than guessing or returning a weak match.'

  const userPrompt = `Meal idea: ${idea}${keyIngredients.length > 0 ? `\nKey ingredients: ${keyIngredients.join(', ')}` : ''}

Find one real recipe online that matches this idea well.`

  try {
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 1, allowed_callers: ['direct'] }],
      output_config: {
        format: zodOutputFormat(FindRecipeSchema),
      },
    })

    if (!response.parsed_output) {
      console.error('find-recipe: no parsed_output')
      return NextResponse.json({ error: 'search failed' }, { status: 502 })
    }

    return NextResponse.json(response.parsed_output)
  } catch (err) {
    console.error('find-recipe failed:', err)
    return NextResponse.json({ error: 'search failed' }, { status: 502 })
  }
}
